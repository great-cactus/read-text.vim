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
} from "./types.ts";
import { latexPreset } from "./presets/latex.ts";

const presets: Map<string, LanguagePreset> = new Map([["latex", latexPreset]]);

/**
 * ReadingRulesParser - Processes text through a pipeline of rules for TTS preparation
 */
export class ReadingRulesParser {
  private rangeRules: RangeExcludeRule[] = [];
  private commandRules: Map<string, CommandRule> = new Map();
  private simpleRules: SimpleExcludeRule[] = [];
  private replaceRules: ReplaceRule[] = [];

  constructor(config: ReadingRulesConfig) {
    if (!config.enabled) return;

    const allRules = this.loadRules(config);
    this.categorizeRules(allRules);
  }

  private loadRules(config: ReadingRulesConfig): ReadingRule[] {
    const allRules: ReadingRule[] = [];

    for (const presetName of config.presets) {
      const preset = presets.get(presetName);
      if (preset) {
        allRules.push(...preset.rules);
      }
    }

    if (config.mode === "override") {
      const customCommandNames = new Set(
        config.customRules
          .filter((r): r is CommandRule => r.type === "command")
          .map((r) => r.name)
      );

      const filtered = allRules.filter(
        (r) => r.type !== "command" || !customCommandNames.has(r.name)
      );
      allRules.length = 0;
      allRules.push(...filtered);
    }

    allRules.push(...config.customRules);
    return allRules;
  }

  private categorizeRules(rules: ReadingRule[]): void {
    for (const rule of rules) {
      switch (rule.type) {
        case "range":
          this.rangeRules.push(rule);
          break;
        case "command":
          this.commandRules.set(rule.name, rule);
          break;
        case "simple":
          this.simpleRules.push(rule);
          break;
        case "replace":
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
    result = this.applyRangeRules(result);
    result = this.applyCommandRules(result);
    result = this.applySimpleRules(result);
    result = this.applyReplaceRules(result);
    result = this.cleanupWhitespace(result);
    return result;
  }

  private applyRangeRules(text: string): string {
    let result = text;
    for (const rule of this.rangeRules) {
      result = this.removeRange(result, rule);
    }
    return result;
  }

  private removeRange(text: string, rule: RangeExcludeRule): string {
    const { start, end, includeNested = true } = rule;
    const result: string[] = [];
    let pos = 0;

    while (pos < text.length) {
      const startIdx = text.indexOf(start, pos);
      if (startIdx === -1) {
        result.push(text.slice(pos));
        break;
      }

      result.push(text.slice(pos, startIdx));
      const endPos = this.findRangeEnd(text, start, end, startIdx + start.length, includeNested);
      pos = endPos;
    }

    return result.join("");
  }

  private findRangeEnd(
    text: string,
    start: string,
    end: string,
    searchFrom: number,
    includeNested: boolean
  ): number {
    let depth = 1;
    let pos = searchFrom;

    while (pos < text.length && depth > 0) {
      const nextStart = includeNested ? text.indexOf(start, pos) : -1;
      const nextEnd = text.indexOf(end, pos);

      if (nextEnd === -1) {
        return text.length;
      }

      if (includeNested && nextStart !== -1 && nextStart < nextEnd) {
        depth++;
        pos = nextStart + start.length;
      } else {
        depth--;
        pos = nextEnd + end.length;
      }
    }

    return pos;
  }

  private applyCommandRules(text: string): string {
    const result: string[] = [];
    let pos = 0;

    while (pos < text.length) {
      if (text[pos] === "\\") {
        const parseResult = this.tryParseCommand(text, pos);
        if (parseResult) {
          result.push(parseResult.output);
          pos = parseResult.endPos;
          continue;
        }
      }
      result.push(text[pos]);
      pos++;
    }

    return result.join("");
  }

  private tryParseCommand(
    text: string,
    pos: number
  ): { output: string; endPos: number } | null {
    const nameResult = this.parseCommandName(text, pos + 1);
    if (!nameResult) return null;

    const rule = this.commandRules.get(nameResult.name);
    if (!rule) return null;

    let idx = this.skipWhitespace(text, nameResult.endPos);
    const argOutputs: string[] = [];

    // Process optional argument
    if (rule.hasOptionalArg && idx < text.length && text[idx] === "[") {
      const optResult = this.extractBracketContent(text, idx, "[", "]");
      if (optResult) {
        if (rule.readOptionalArg) {
          argOutputs.push(this.applyCommandRules(optResult.content));
        }
        idx = this.skipWhitespace(text, optResult.endPos);
      }
    }

    // Process required arguments
    for (let i = 0; i < rule.argCount; i++) {
      idx = this.skipWhitespace(text, idx);
      if (idx >= text.length || text[idx] !== "{") break;

      const argResult = this.extractBracketContent(text, idx, "{", "}");
      if (!argResult) break;

      if (rule.argMask[i]) {
        argOutputs.push(this.applyCommandRules(argResult.content));
      }
      idx = argResult.endPos;
    }

    const output = (rule.prefix ?? "") + argOutputs.join("") + (rule.suffix ?? "");
    return { output, endPos: idx };
  }

  private parseCommandName(
    text: string,
    pos: number
  ): { name: string; endPos: number } | null {
    let idx = pos;
    while (idx < text.length && /[a-zA-Z]/.test(text[idx])) {
      idx++;
    }
    if (idx === pos) return null;
    return { name: text.slice(pos, idx), endPos: idx };
  }

  private skipWhitespace(text: string, pos: number): number {
    while (pos < text.length && /\s/.test(text[pos])) {
      pos++;
    }
    return pos;
  }

  private extractBracketContent(
    text: string,
    pos: number,
    openBracket: string,
    closeBracket: string
  ): { content: string; endPos: number } | null {
    if (text[pos] !== openBracket) return null;

    let depth = 1;
    let idx = pos + 1;

    while (idx < text.length && depth > 0) {
      if (text[idx] === "\\" && idx + 1 < text.length) {
        idx += 2;
        continue;
      }

      if (text[idx] === openBracket) depth++;
      else if (text[idx] === closeBracket) depth--;

      if (depth > 0) idx++;
    }

    if (depth !== 0) return null;

    return { content: text.slice(pos + 1, idx), endPos: idx + 1 };
  }

  private applySimpleRules(text: string): string {
    let result = text;

    for (const rule of this.simpleRules) {
      try {
        const pattern = rule.isRegex ? rule.pattern : this.escapeRegExp(rule.pattern);
        const regex = new RegExp(pattern, rule.flags ?? "g");
        result = result.replace(regex, "");
      } catch {
        continue;
      }
    }

    return result;
  }

  private applyReplaceRules(text: string): string {
    let result = text;

    for (const rule of this.replaceRules) {
      try {
        const pattern = rule.isRegex ? rule.pattern : this.escapeRegExp(rule.pattern);
        const regex = new RegExp(pattern, rule.flags ?? "g");
        result = result.replace(regex, rule.replacement);
      } catch {
        continue;
      }
    }

    return result;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private cleanupWhitespace(text: string): string {
    return text
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\s+|\s+$/gm, "")
      .trim();
  }
}

/**
 * Create a parser from file pattern
 */
export function createParserForFile(
  filename: string,
  customConfig?: Partial<ReadingRulesConfig>
): ReadingRulesParser {
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
    mode: customConfig?.mode ?? "extend",
    enabled: customConfig?.enabled ?? true,
  };

  return new ReadingRulesParser(config);
}

function matchGlob(filename: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  return new RegExp(`^${regexPattern}$`, "i").test(filename);
}

export function registerPreset(preset: LanguagePreset): void {
  presets.set(preset.name, preset);
}

export function getPresetNames(): string[] {
  return Array.from(presets.keys());
}
