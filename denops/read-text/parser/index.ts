// Parser module exports

export type {
  ReadingRule,
  CommandRule,
  RangeExcludeRule,
  SimpleExcludeRule,
  ReplaceRule,
  LanguagePreset,
  ReadingRulesConfig,
} from './types.ts';

export { defaultReadingRulesConfig } from './types.ts';

export {
  ReadingRulesParser,
  createParserForFile,
  registerPreset,
  getPresetNames,
} from './parser.ts';

export { latexPreset } from './presets/latex.ts';
