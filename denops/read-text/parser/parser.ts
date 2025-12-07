// Reading rules parser implementation
// Processes text for TTS by removing/transforming LaTeX and other markup

import type {
  ReadingRule,
  CommandRule,
  RangeExcludeRule,
  SimpleExcludeRule,
  ReplaceRule,
  LanguagePreset,
  ReadingRulesConfig,
} from './types.ts';
import { latexPreset } from './presets/latex.ts';

/** Available presets */
const presets: Map<string, LanguagePreset> = new Map([
  ['latex', latexPreset],
]);

/**
 * ReadingRulesParser
 * Processes text through a pipeline of rules for TTS preparation
 */
export class ReadingRulesParser {
  private rangeRules: RangeExcludeRule[] = [];
  private commandRules: Map<string, CommandRule> = new Map();
  private simpleRules: SimpleExcludeRule[] = [];
  private replaceRules: ReplaceRule[] = [];

  constructor(config: ReadingRulesConfig) {
    if (!config.enabled) {
      return;
    }

    const allRules: ReadingRule[] = [];

    // Load preset rules
    if (config.mode === 'extend' || config.mode === 'override') {
      for (const presetName of config.presets) {
        const preset = presets.get(presetName);
        if (preset) {
          allRules.push(...preset.rules);
        }
      }
    }

    // Add custom rules (may override preset rules if mode is 'override')
    if (config.mode === 'override') {
      // Custom rules completely replace preset rules for same command names
      const customCommandNames = new Set(
        config.customRules
          .filter((r): r is CommandRule => r.type === 'command')
          .map(r => r.name)
      );

      // Filter out preset command rules that are overridden
      const filteredRules = allRules.filter(r => {
        if (r.type === 'command') {
          return !customCommandNames.has(r.name);
        }
        return true;
      });

      allRules.length = 0;
      allRules.push(...filteredRules);
    }

    allRules.push(...config.customRules);

    // Categorize rules
    for (const rule of allRules) {
      switch (rule.type) {
        case 'range':
          this.rangeRules.push(rule);
          break;
        case 'command':
          this.commandRules.set(rule.name, rule);
          break;
        case 'simple':
          this.simpleRules.push(rule);
          break;
        case 'replace':
          this.replaceRules.push(rule);
          break;
      }
    }
  }

  /**
   * Process text through the full pipeline
   * Order: RangeExclude -> CommandParse -> SimpleExclude -> Replace
   */
  parse(text: string): string {
    let result = text;

    // 1. Range exclude
    result = this.applyRangeRules(result);

    // 2. Command parse
    result = this.applyCommandRules(result);

    // 3. Simple exclude
    result = this.applySimpleRules(result);

    // 4. Replace
    result = this.applyReplaceRules(result);

    // Clean up extra whitespace
    result = this.cleanupWhitespace(result);

    return result;
  }

  /**
   * Apply range exclude rules
   * Removes content between start and end markers
   */
  private applyRangeRules(text: string): string {
    let result = text;

    for (const rule of this.rangeRules) {
      result = this.removeRange(result, rule);
    }

    return result;
  }

  /**
   * Remove a range from text, handling nested structures
   */
  private removeRange(text: string, rule: RangeExcludeRule): string {
    const { start, end, includeNested = true } = rule;
    let result = '';
    let pos = 0;

    while (pos < text.length) {
      const startIdx = text.indexOf(start, pos);

      if (startIdx === -1) {
        // No more start markers, append rest
        result += text.slice(pos);
        break;
      }

      // Append text before start marker
      result += text.slice(pos, startIdx);

      // Find matching end marker
      let depth = 1;
      let searchPos = startIdx + start.length;
      let endIdx = -1;

      while (searchPos < text.length && depth > 0) {
        const nextStart = includeNested ? text.indexOf(start, searchPos) : -1;
        const nextEnd = text.indexOf(end, searchPos);

        if (nextEnd === -1) {
          // No end marker found, graceful degradation
          searchPos = text.length;
          break;
        }

        if (includeNested && nextStart !== -1 && nextStart < nextEnd) {
          // Found nested start before end
          depth++;
          searchPos = nextStart + start.length;
        } else {
          // Found end
          depth--;
          if (depth === 0) {
            endIdx = nextEnd;
          }
          searchPos = nextEnd + end.length;
        }
      }

      if (endIdx !== -1) {
        // Skip the entire range including end marker
        pos = endIdx + end.length;
      } else {
        // No matching end found, skip just the start marker (graceful degradation)
        pos = startIdx + start.length;
      }
    }

    return result;
  }

  /**
   * Apply command rules using character-by-character parsing
   */
  private applyCommandRules(text: string): string {
    let result = '';
    let pos = 0;

    while (pos < text.length) {
      if (text[pos] === '\\') {
        // Potential command start
        const parseResult = this.tryParseCommand(text, pos);

        if (parseResult) {
          result += parseResult.output;
          pos = parseResult.endPos;
        } else {
          // Not a recognized command, keep the backslash
          result += text[pos];
          pos++;
        }
      } else {
        result += text[pos];
        pos++;
      }
    }

    return result;
  }

  /**
   * Try to parse a command at the given position
   * Returns null if no matching command found
   */
  private tryParseCommand(text: string, pos: number): { output: string; endPos: number } | null {
    // Skip backslash
    let idx = pos + 1;

    // Extract command name (letters only for standard LaTeX commands)
    const nameStart = idx;
    while (idx < text.length && /[a-zA-Z]/.test(text[idx])) {
      idx++;
    }

    if (idx === nameStart) {
      // No command name found (might be \\ or \{ etc.)
      return null;
    }

    const commandName = text.slice(nameStart, idx);
    const rule = this.commandRules.get(commandName);

    if (!rule) {
      // Unknown command, don't process
      return null;
    }

    // Skip whitespace after command name
    while (idx < text.length && /\s/.test(text[idx])) {
      idx++;
    }

    let output = rule.prefix ?? '';
    const argOutputs: string[] = [];

    // Process optional argument if expected
    if (rule.hasOptionalArg && idx < text.length && text[idx] === '[') {
      const optResult = this.extractBracketContent(text, idx, '[', ']');
      if (optResult) {
        if (rule.readOptionalArg) {
          // Recursively process optional arg content
          const processed = this.applyCommandRules(optResult.content);
          argOutputs.push(processed);
        }
        idx = optResult.endPos;

        // Skip whitespace after optional arg
        while (idx < text.length && /\s/.test(text[idx])) {
          idx++;
        }
      }
    }

    // Process required arguments
    for (let i = 0; i < rule.argCount; i++) {
      // Skip whitespace before argument
      while (idx < text.length && /\s/.test(text[idx])) {
        idx++;
      }

      if (idx >= text.length || text[idx] !== '{') {
        // Missing required argument, graceful degradation
        // Return what we have so far
        break;
      }

      const argResult = this.extractBracketContent(text, idx, '{', '}');
      if (argResult) {
        if (rule.argMask[i]) {
          // Recursively process argument content
          const processed = this.applyCommandRules(argResult.content);
          argOutputs.push(processed);
        }
        idx = argResult.endPos;
      } else {
        // Failed to extract argument, graceful degradation
        break;
      }
    }

    output += argOutputs.join('');
    output += rule.suffix ?? '';

    return { output, endPos: idx };
  }

  /**
   * Extract content within balanced brackets
   * Handles nested brackets correctly
   */
  private extractBracketContent(
    text: string,
    pos: number,
    openBracket: string,
    closeBracket: string
  ): { content: string; endPos: number } | null {
    if (text[pos] !== openBracket) {
      return null;
    }

    let depth = 1;
    let idx = pos + 1;
    const contentStart = idx;

    while (idx < text.length && depth > 0) {
      const char = text[idx];

      // Handle escape sequences
      if (char === '\\' && idx + 1 < text.length) {
        // Skip escaped character
        idx += 2;
        continue;
      }

      if (char === openBracket) {
        depth++;
      } else if (char === closeBracket) {
        depth--;
      }

      if (depth > 0) {
        idx++;
      }
    }

    if (depth !== 0) {
      // Unbalanced brackets, graceful degradation
      return null;
    }

    const content = text.slice(contentStart, idx);
    return { content, endPos: idx + 1 };
  }

  /**
   * Apply simple exclude rules (regex patterns)
   */
  private applySimpleRules(text: string): string {
    let result = text;

    for (const rule of this.simpleRules) {
      try {
        if (rule.isRegex) {
          const regex = new RegExp(rule.pattern, rule.flags ?? 'g');
          result = result.replace(regex, '');
        } else {
          // Simple string replacement
          const escaped = this.escapeRegExp(rule.pattern);
          const regex = new RegExp(escaped, rule.flags ?? 'g');
          result = result.replace(regex, '');
        }
      } catch {
        // Invalid regex, skip this rule (graceful degradation)
        continue;
      }
    }

    return result;
  }

  /**
   * Apply replace rules
   */
  private applyReplaceRules(text: string): string {
    let result = text;

    for (const rule of this.replaceRules) {
      try {
        if (rule.isRegex) {
          const regex = new RegExp(rule.pattern, rule.flags ?? 'g');
          result = result.replace(regex, rule.replacement);
        } else {
          // Simple string replacement - need to escape special chars
          const escaped = this.escapeRegExp(rule.pattern);
          const regex = new RegExp(escaped, rule.flags ?? 'g');
          result = result.replace(regex, rule.replacement);
        }
      } catch {
        // Invalid regex, skip this rule (graceful degradation)
        continue;
      }
    }

    return result;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clean up extra whitespace
   */
  private cleanupWhitespace(text: string): string {
    return text
      .replace(/[ \t]+/g, ' ')       // Multiple spaces/tabs to single space
      .replace(/\n{3,}/g, '\n\n')    // 3+ newlines to 2
      .replace(/^\s+|\s+$/gm, '')    // Trim each line
      .trim();
  }
}

/**
 * Create a parser from file pattern
 * Automatically selects appropriate preset based on file extension
 */
export function createParserForFile(
  filename: string,
  customConfig?: Partial<ReadingRulesConfig>
): ReadingRulesParser {
  // Find matching preset
  let matchedPresetName: string | null = null;

  for (const [name, preset] of presets) {
    for (const pattern of preset.filePatterns) {
      if (matchGlob(filename, pattern)) {
        matchedPresetName = name;
        break;
      }
    }
    if (matchedPresetName) break;
  }

  const config: ReadingRulesConfig = {
    presets: matchedPresetName ? [matchedPresetName] : [],
    customRules: customConfig?.customRules ?? [],
    mode: customConfig?.mode ?? 'extend',
    enabled: customConfig?.enabled ?? true,
  };

  return new ReadingRulesParser(config);
}

/**
 * Simple glob pattern matching
 */
function matchGlob(filename: string, pattern: string): boolean {
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(filename);
}

/**
 * Register a custom preset
 */
export function registerPreset(preset: LanguagePreset): void {
  presets.set(preset.name, preset);
}

/**
 * Get all registered preset names
 */
export function getPresetNames(): string[] {
  return Array.from(presets.keys());
}
