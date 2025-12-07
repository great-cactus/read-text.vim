// LaTeX preset for reading rules

import type { LanguagePreset } from '../types.ts';

/**
 * LaTeX language preset
 * Defines rules for processing LaTeX documents for text-to-speech
 */
export const latexPreset: LanguagePreset = {
  name: 'latex',
  filePatterns: ['*.tex', '*.ltx', '*.sty', '*.cls'],
  rules: [
    // -------------------------------------------------------
    // 1. Range Exclude Rules
    // Blocks that should not be displayed or read after compilation
    // -------------------------------------------------------
    { type: 'range', start: '\\begin{comment}', end: '\\end{comment}' },
    { type: 'range', start: '\\begin{lstlisting}', end: '\\end{lstlisting}' },
    { type: 'range', start: '\\begin{verbatim}', end: '\\end{verbatim}' },
    { type: 'range', start: '\\begin{minted}', end: '\\end{minted}' },
    { type: 'range', start: '\\begin{figure}', end: '\\end{figure}' },
    { type: 'range', start: '\\begin{table}', end: '\\end{table}' },

    // -------------------------------------------------------
    // 2. Command Rules - Keep Content
    // Decoration commands: keep only the content (arguments)
    // -------------------------------------------------------
    { type: 'command', name: 'section', argCount: 1, argMask: [true], hasOptionalArg: true },
    { type: 'command', name: 'subsection', argCount: 1, argMask: [true], hasOptionalArg: true },
    { type: 'command', name: 'subsubsection', argCount: 1, argMask: [true], hasOptionalArg: true },
    { type: 'command', name: 'chapter', argCount: 1, argMask: [true], hasOptionalArg: true },
    { type: 'command', name: 'paragraph', argCount: 1, argMask: [true], hasOptionalArg: true },
    { type: 'command', name: 'subparagraph', argCount: 1, argMask: [true], hasOptionalArg: true },

    // Font styles
    { type: 'command', name: 'textbf', argCount: 1, argMask: [true] },
    { type: 'command', name: 'textit', argCount: 1, argMask: [true] },
    { type: 'command', name: 'textsl', argCount: 1, argMask: [true] },
    { type: 'command', name: 'textsc', argCount: 1, argMask: [true] },
    { type: 'command', name: 'textrm', argCount: 1, argMask: [true] },
    { type: 'command', name: 'textsf', argCount: 1, argMask: [true] },
    { type: 'command', name: 'texttt', argCount: 1, argMask: [true] },
    { type: 'command', name: 'emph', argCount: 1, argMask: [true] },
    { type: 'command', name: 'underline', argCount: 1, argMask: [true] },

    // Annotations
    { type: 'command', name: 'footnote', argCount: 1, argMask: [true], prefix: 'footnote, ' },
    { type: 'command', name: 'marginpar', argCount: 1, argMask: [true], prefix: 'margin note, ' },

    // List items (optional argument [label] typically not read)
    { type: 'command', name: 'item', argCount: 0, argMask: [], hasOptionalArg: true, readOptionalArg: false },

    // Title commands
    { type: 'command', name: 'title', argCount: 1, argMask: [true] },
    { type: 'command', name: 'author', argCount: 1, argMask: [true] },
    { type: 'command', name: 'date', argCount: 1, argMask: [true] },

    // -------------------------------------------------------
    // 3. Command Rules - Ignore Content
    // Metadata and reference IDs not displayed after compilation
    // -------------------------------------------------------
    // argMask: [false] safely removes {...} by parsing brace pairs
    { type: 'command', name: 'label'     , argCount: 1, argMask: [false] },
    { type: 'command', name: 'ref'       , argCount: 1, argMask: [false] },
    { type: 'command', name: 'eqref'     , argCount: 1, argMask: [false] },
    { type: 'command', name: 'pageref'   , argCount: 1, argMask: [false] },
    { type: 'command', name: 'ce'        , argCount: 1, argMask: [false], hasOptionalArg: true },
    { type: 'command', name: 'cite'      , argCount: 1, argMask: [false], hasOptionalArg: true },
    { type: 'command', name: 'citet'     , argCount: 1, argMask: [false], hasOptionalArg: true },
    { type: 'command', name: 'citep'     , argCount: 1, argMask: [false], hasOptionalArg: true },
    { type: 'command', name: 'citeauthor', argCount: 1, argMask: [false], hasOptionalArg: true },
    { type: 'command', name: 'citeyear'  , argCount: 1, argMask: [false], hasOptionalArg: true },

    // External file loading, URLs
    { type: 'command', name: 'url', argCount: 1, argMask: [false] },
    { type: 'command', name: 'input', argCount: 1, argMask: [false] },
    { type: 'command', name: 'include', argCount: 1, argMask: [false] },
    { type: 'command', name: 'includegraphics', argCount: 1, argMask: [false], hasOptionalArg: true },
    { type: 'command', name: 'bibliography', argCount: 1, argMask: [false] },
    { type: 'command', name: 'bibliographystyle', argCount: 1, argMask: [false] },

    // Preamble commands
    { type: 'command', name: 'usepackage', argCount: 1, argMask: [false], hasOptionalArg: true },
    { type: 'command', name: 'documentclass', argCount: 1, argMask: [false], hasOptionalArg: true },
    { type: 'command', name: 'newcommand', argCount: 2, argMask: [false, false], hasOptionalArg: true },
    { type: 'command', name: 'renewcommand', argCount: 2, argMask: [false, false], hasOptionalArg: true },
    { type: 'command', name: 'setlength', argCount: 2, argMask: [false, false] },
    { type: 'command', name: 'setcounter', argCount: 2, argMask: [false, false] },

    // Complex argument processing: \href{url}{text} -> read only text
    { type: 'command', name: 'href', argCount: 2, argMask: [false, true] },
    // \ruby{kanji}{furigana} -> read only kanji (configurable)
    { type: 'command', name: 'ruby', argCount: 2, argMask: [true, false] },

    // -------------------------------------------------------
    // 4. Simple Exclude Rules
    // Pattern removal applied before/after command parsing
    // -------------------------------------------------------
    // Line-end comments (% to end of line, but not escaped \%)
    { type: 'simple', pattern: '(?<!\\\\)%.*$', isRegex: true, flags: 'gm' },

    // Environment start/end tags (content may remain if not removed by RangeRule)
    // e.g., \begin{itemize} ... \end{itemize} -> keep \item ... inside
    { type: 'simple', pattern: '\\\\(begin|end)\\{[^}]+\\}(\\[[^\\]]*\\])?', isRegex: true, flags: 'g' },

    // Math mode delimiters ($ and $$)
    { type: 'simple', pattern: '\\$+', isRegex: true, flags: 'g' },

    // Display math environments \[ \]
    { type: 'simple', pattern: '\\\\\\[|\\\\\\]', isRegex: true, flags: 'g' },

    // Inline math \( \)
    { type: 'simple', pattern: '\\\\\\(|\\\\\\)', isRegex: true, flags: 'g' },

    // Line breaks and spacing commands
    { type: 'simple', pattern: '\\\\\\\\(\\[[^\\]]*\\])?', isRegex: true, flags: 'g' },
    { type: 'simple', pattern: '\\\\(hspace|vspace|hfill|vfill|quad|qquad|,|;|!|\\s)\\*?(\\{[^}]*\\})?', isRegex: true, flags: 'g' },

    // -------------------------------------------------------
    // 5. Replace Rules
    // -------------------------------------------------------
    // Greek letters
    { type: 'replace', pattern: '\\alpha', isRegex: false, replacement: 'alpha' },
    { type: 'replace', pattern: '\\beta', isRegex: false, replacement: 'beta' },
    { type: 'replace', pattern: '\\gamma', isRegex: false, replacement: 'gamma' },
    { type: 'replace', pattern: '\\delta', isRegex: false, replacement: 'delta' },
    { type: 'replace', pattern: '\\epsilon', isRegex: false, replacement: 'epsilon' },
    { type: 'replace', pattern: '\\varepsilon', isRegex: false, replacement: 'epsilon' },
    { type: 'replace', pattern: '\\zeta', isRegex: false, replacement: 'zeta' },
    { type: 'replace', pattern: '\\eta', isRegex: false, replacement: 'eta' },
    { type: 'replace', pattern: '\\theta', isRegex: false, replacement: 'theta' },
    { type: 'replace', pattern: '\\vartheta', isRegex: false, replacement: 'theta' },
    { type: 'replace', pattern: '\\iota', isRegex: false, replacement: 'iota' },
    { type: 'replace', pattern: '\\kappa', isRegex: false, replacement: 'kappa' },
    { type: 'replace', pattern: '\\lambda', isRegex: false, replacement: 'lambda' },
    { type: 'replace', pattern: '\\mu', isRegex: false, replacement: 'mu' },
    { type: 'replace', pattern: '\\nu', isRegex: false, replacement: 'nu' },
    { type: 'replace', pattern: '\\xi', isRegex: false, replacement: 'xi' },
    { type: 'replace', pattern: '\\pi', isRegex: false, replacement: 'pi' },
    { type: 'replace', pattern: '\\varpi', isRegex: false, replacement: 'pi' },
    { type: 'replace', pattern: '\\rho', isRegex: false, replacement: 'rho' },
    { type: 'replace', pattern: '\\varrho', isRegex: false, replacement: 'rho' },
    { type: 'replace', pattern: '\\sigma', isRegex: false, replacement: 'sigma' },
    { type: 'replace', pattern: '\\varsigma', isRegex: false, replacement: 'sigma' },
    { type: 'replace', pattern: '\\tau', isRegex: false, replacement: 'tau' },
    { type: 'replace', pattern: '\\upsilon', isRegex: false, replacement: 'upsilon' },
    { type: 'replace', pattern: '\\phi', isRegex: false, replacement: 'phi' },
    { type: 'replace', pattern: '\\varphi', isRegex: false, replacement: 'phi' },
    { type: 'replace', pattern: '\\chi', isRegex: false, replacement: 'chi' },
    { type: 'replace', pattern: '\\psi', isRegex: false, replacement: 'psi' },
    { type: 'replace', pattern: '\\omega', isRegex: false, replacement: 'omega' },

    // Capital Greek letters
    { type: 'replace', pattern: '\\Gamma', isRegex: false, replacement: 'Gamma' },
    { type: 'replace', pattern: '\\Delta', isRegex: false, replacement: 'Delta' },
    { type: 'replace', pattern: '\\Theta', isRegex: false, replacement: 'Theta' },
    { type: 'replace', pattern: '\\Lambda', isRegex: false, replacement: 'Lambda' },
    { type: 'replace', pattern: '\\Xi', isRegex: false, replacement: 'Xi' },
    { type: 'replace', pattern: '\\Pi', isRegex: false, replacement: 'Pi' },
    { type: 'replace', pattern: '\\Sigma', isRegex: false, replacement: 'Sigma' },
    { type: 'replace', pattern: '\\Upsilon', isRegex: false, replacement: 'Upsilon' },
    { type: 'replace', pattern: '\\Phi', isRegex: false, replacement: 'Phi' },
    { type: 'replace', pattern: '\\Psi', isRegex: false, replacement: 'Psi' },
    { type: 'replace', pattern: '\\Omega', isRegex: false, replacement: 'Omega' },

    // Mathematical symbols
    { type: 'replace', pattern: '\\neq', isRegex: false, replacement: 'not equal to' },
    { type: 'replace', pattern: '\\approx', isRegex: false, replacement: 'approximately equal to' },
    { type: 'replace', pattern: '\\leq', isRegex: false, replacement: 'less than or equal to' },
    { type: 'replace', pattern: '\\geq', isRegex: false, replacement: 'greater than or equal to' },
    { type: 'replace', pattern: '\\times', isRegex: false, replacement: 'times' },
    { type: 'replace', pattern: '\\div', isRegex: false, replacement: 'divided by' },
    { type: 'replace', pattern: '\\pm', isRegex: false, replacement: 'plus or minus' },
    { type: 'replace', pattern: '\\mp', isRegex: false, replacement: 'minus or plus' },
    { type: 'replace', pattern: '\\infty', isRegex: false, replacement: 'infinity' },
    { type: 'replace', pattern: '\\partial', isRegex: false, replacement: 'partial' },
    { type: 'replace', pattern: '\\nabla', isRegex: false, replacement: 'nabla' },
    { type: 'replace', pattern: '\\sum', isRegex: false, replacement: 'sum' },
    { type: 'replace', pattern: '\\prod', isRegex: false, replacement: 'product' },
    { type: 'replace', pattern: '\\int', isRegex: false, replacement: 'integral' },
    { type: 'replace', pattern: '\\oint', isRegex: false, replacement: 'contour integral' },
    { type: 'replace', pattern: '\\rightarrow', isRegex: false, replacement: 'right arrow' },
    { type: 'replace', pattern: '\\leftarrow', isRegex: false, replacement: 'left arrow' },
    { type: 'replace', pattern: '\\Rightarrow', isRegex: false, replacement: 'implies' },
    { type: 'replace', pattern: '\\Leftarrow', isRegex: false, replacement: 'implied by' },
    { type: 'replace', pattern: '\\Leftrightarrow', isRegex: false, replacement: 'if and only if' },
    { type: 'replace', pattern: '\\forall', isRegex: false, replacement: 'for all' },
    { type: 'replace', pattern: '\\exists', isRegex: false, replacement: 'there exists' },
    { type: 'replace', pattern: '\\in', isRegex: false, replacement: 'in' },
    { type: 'replace', pattern: '\\notin', isRegex: false, replacement: 'not in' },
    { type: 'replace', pattern: '\\subset', isRegex: false, replacement: 'subset of' },
    { type: 'replace', pattern: '\\supset', isRegex: false, replacement: 'superset of' },
    { type: 'replace', pattern: '\\subseteq', isRegex: false, replacement: 'subset or equal to' },
    { type: 'replace', pattern: '\\supseteq', isRegex: false, replacement: 'superset or equal to' },
    { type: 'replace', pattern: '\\cup', isRegex: false, replacement: 'union' },
    { type: 'replace', pattern: '\\cap', isRegex: false, replacement: 'intersection' },
    { type: 'replace', pattern: '\\emptyset', isRegex: false, replacement: 'empty set' },
    { type: 'replace', pattern: '\\cdot', isRegex: false, replacement: 'dot' },
    { type: 'replace', pattern: '\\equiv', isRegex: false, replacement: 'equivalent to' },
    { type: 'replace', pattern: '\\propto', isRegex: false, replacement: 'proportional to' },
    { type: 'replace', pattern: '\\perp', isRegex: false, replacement: 'perpendicular to' },
    { type: 'replace', pattern: '\\parallel', isRegex: false, replacement: 'parallel to' },

    // Special characters
    { type: 'replace', pattern: '\\ldots', isRegex: false, replacement: '...' },
    { type: 'replace', pattern: '\\cdots', isRegex: false, replacement: '...' },
    { type: 'replace', pattern: '\\dots', isRegex: false, replacement: '...' },
    { type: 'replace', pattern: '\\&', isRegex: false, replacement: 'and' },
    { type: 'replace', pattern: '\\%', isRegex: false, replacement: 'percent' },
    { type: 'replace', pattern: '\\#', isRegex: false, replacement: 'hash' },
    { type: 'replace', pattern: '\\_', isRegex: false, replacement: 'underscore' },
    { type: 'replace', pattern: '\\{', isRegex: false, replacement: '{' },
    { type: 'replace', pattern: '\\}', isRegex: false, replacement: '}' },
    { type: 'replace', pattern: '\\textbackslash', isRegex: false, replacement: 'backslash' },

    // Tilde and special spacing
    { type: 'replace', pattern: '~', isRegex: false, replacement: ' ' },
  ]
};
