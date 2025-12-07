// Unit tests for ReadingRulesParser

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ReadingRulesParser } from "../../denops/read-text/parser/parser.ts";
import type { ReadingRulesConfig } from "../../denops/read-text/parser/types.ts";

// Default config using LaTeX preset
const defaultConfig: ReadingRulesConfig = {
  presets: ['latex'],
  customRules: [],
  mode: 'extend',
  enabled: true,
};

Deno.test("ReadingRulesParser - Range exclude: removes comment block", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `Hello
\\begin{comment}
This is a comment
\\end{comment}
World`;
  const result = parser.parse(input);
  // Verify comment content is removed and structure is preserved
  assertEquals(result.includes("This is a comment"), false);
  assertEquals(result.includes("Hello"), true);
  assertEquals(result.includes("World"), true);
});

Deno.test("ReadingRulesParser - Range exclude: handles nested structures", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `Before
\\begin{verbatim}
\\begin{verbatim}
Nested content
\\end{verbatim}
\\end{verbatim}
After`;
  const result = parser.parse(input);
  // Verify nested content is removed
  assertEquals(result.includes("Nested content"), false);
  assertEquals(result.includes("Before"), true);
  assertEquals(result.includes("After"), true);
});

Deno.test("ReadingRulesParser - Command: keeps section content", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\section{Introduction}`;
  const expected = `Introduction`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Command: removes label", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\section{Introduction}\\label{sec:intro}`;
  const expected = `Introduction`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Command: handles nested commands", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\section{\\textbf{Bold Title}}`;
  const expected = `Bold Title`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Command: handles nested braces", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\cite{author{2024}}`;
  const expected = ``;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Command: href keeps only link text", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\href{https://example.com}{Example Link}`;
  const expected = `Example Link`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Command: footnote with prefix", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `Main text\\footnote{This is a footnote}.`;
  const expected = `Main textfootnote, This is a footnote.`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Simple exclude: removes comments", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `Text before % This is a comment
Text after`;
  const expected = `Text before
Text after`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Simple exclude: removes begin/end tags", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\begin{itemize}
\\item First
\\item Second
\\end{itemize}`;
  const expected = `First
Second`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Simple exclude: removes math delimiters", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `The equation $x = 5$ is simple.`;
  const expected = `The equation x = 5 is simple.`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Replace: Greek letters", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\alpha and \\beta`;
  const expected = `alpha and beta`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Replace: mathematical symbols", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `a \\neq b and c \\approx d`;
  const expected = `a not equal to b and c approximately equal to d`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Complex: full LaTeX paragraph", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\section{Results}\\label{sec:results}
The value $\\alpha = 0.05$ is significant\\cite{smith2023}.
See Figure~\\ref{fig:main} for details.`;
  const expected = `Results
The value alpha = 0.05 is significant.
See Figure for details.`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Graceful degradation: unbalanced braces", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\section{Incomplete`;
  // Should not throw, returns what it can parse
  const result = parser.parse(input);
  assertEquals(typeof result, "string");
});

Deno.test("ReadingRulesParser - Graceful degradation: unknown command", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\unknowncommand{content}`;
  // Unknown commands should be left as-is
  const result = parser.parse(input);
  assertEquals(result.includes("unknowncommand"), true);
});

Deno.test("ReadingRulesParser - Disabled config returns original text", () => {
  const disabledConfig: ReadingRulesConfig = {
    presets: ['latex'],
    customRules: [],
    mode: 'extend',
    enabled: false,
  };
  const parser = new ReadingRulesParser(disabledConfig);
  const input = `\\section{Title}`;
  assertEquals(parser.parse(input), input);
});

Deno.test("ReadingRulesParser - Custom rules extend preset", () => {
  const customConfig: ReadingRulesConfig = {
    presets: ['latex'],
    customRules: [
      { type: 'command', name: 'mycommand', argCount: 1, argMask: [true], prefix: 'CUSTOM:' },
    ],
    mode: 'extend',
    enabled: true,
  };
  const parser = new ReadingRulesParser(customConfig);
  const input = `\\mycommand{hello}`;
  const expected = `CUSTOM:hello`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Override mode replaces preset rules", () => {
  const overrideConfig: ReadingRulesConfig = {
    presets: ['latex'],
    customRules: [
      { type: 'command', name: 'section', argCount: 1, argMask: [true], prefix: 'SECTION:' },
    ],
    mode: 'override',
    enabled: true,
  };
  const parser = new ReadingRulesParser(overrideConfig);
  const input = `\\section{Title}`;
  const expected = `SECTION:Title`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Optional argument handling", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\section[Short Title]{Full Section Title}`;
  const expected = `Full Section Title`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Multiple commands in sequence", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `\\textbf{bold} and \\textit{italic} text`;
  const expected = `bold and italic text`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Tilde replacement for non-breaking space", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  const input = `Dr.~Smith`;
  const expected = `Dr. Smith`;
  assertEquals(parser.parse(input), expected);
});

Deno.test("ReadingRulesParser - Escaped characters", () => {
  const parser = new ReadingRulesParser(defaultConfig);
  // Note: In actual LaTeX files, \% appears as a single backslash + %
  // In JavaScript string, we need to escape: \\% represents \% in the file
  const input = String.raw`100\% complete`;
  const expected = `100percent complete`;
  assertEquals(parser.parse(input), expected);
});
