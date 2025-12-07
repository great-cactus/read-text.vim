// Type definitions for reading rules parser

/**
 * Command processing rule (recommended)
 * Defines processing for commands with arguments
 */
export interface CommandRule {
  type: 'command';

  /** Command name without backslash (e.g., "section", "cite") */
  name: string;

  /** Number of required arguments {...} */
  argCount: number;

  /**
   * Mask for whether to read each argument
   * true: read, false: ignore
   * Example: \href{url}{text} (argCount: 2) -> [false, true]
   */
  argMask: boolean[];

  /** Whether the command can have optional arguments [...] (default: false) */
  hasOptionalArg?: boolean;

  /** Whether to read optional argument content (default: false) */
  readOptionalArg?: boolean;

  /** Prefix to add when reading (e.g., "footnote,") */
  prefix?: string;

  /** Suffix to add when reading */
  suffix?: string;
}

/**
 * Range exclude rule
 * Ignores entire blocks between start and end markers
 */
export interface RangeExcludeRule {
  type: 'range';
  start: string;
  end: string;
  /** Whether to consider nested blocks with same name (default: true) */
  includeNested?: boolean;
}

/**
 * Simple exclude rule
 * Removes matched parts using regex
 */
export interface SimpleExcludeRule {
  type: 'simple';
  pattern: string;
  isRegex: boolean;
  /** RegExp flags: 'g', 'i', 'm' etc. */
  flags?: string;
}

/**
 * Replace rule
 * Replaces specific patterns with specified strings
 */
export interface ReplaceRule {
  type: 'replace';
  pattern: string;
  isRegex: boolean;
  flags?: string;
  replacement: string;
}

/** Unified rule type */
export type ReadingRule = CommandRule | RangeExcludeRule | SimpleExcludeRule | ReplaceRule;

/** Language preset definition */
export interface LanguagePreset {
  name: string;
  filePatterns: string[]; // e.g., ["*.tex", "*.sty"]
  rules: ReadingRule[];
}

/** User configuration */
export interface ReadingRulesConfig {
  presets: string[];          // Preset names to use
  customRules: ReadingRule[]; // User-defined rules
  mode: 'override' | 'extend'; // Whether to override or extend presets
  enabled: boolean;
}

/** Default reading rules configuration */
export const defaultReadingRulesConfig: ReadingRulesConfig = {
  presets: ['latex'],
  customRules: [],
  mode: 'extend',
  enabled: true,
};
