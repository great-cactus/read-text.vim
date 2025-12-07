// Text extraction utilities for Vim/Neovim

import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import { collect } from "https://deno.land/x/denops_std@v6.4.0/batch/mod.ts";
import { createParserForFile, ReadingRulesParser } from "./parser/index.ts";
import type { ReadingRulesConfig } from "./parser/types.ts";

export class TextExtractor {
  private denops: Denops;
  private parser: ReadingRulesParser | null = null;
  private parserConfig: ReadingRulesConfig | null = null;

  constructor(denops: Denops) {
    this.denops = denops;
  }

  /**
   * Configure the parser with reading rules
   */
  setParserConfig(config: ReadingRulesConfig): void {
    this.parserConfig = config;
    this.parser = null; // Reset parser to be recreated with new config
  }

  /**
   * Get or create parser based on current file
   */
  private async getParser(): Promise<ReadingRulesParser | null> {
    if (!this.parserConfig?.enabled) {
      return null;
    }

    const filename = await fn.expand(this.denops, "%:t") as string;

    if (!filename) {
      return null;
    }

    // Create parser for current file type
    this.parser = createParserForFile(filename, this.parserConfig);
    return this.parser;
  }

  /**
   * Apply reading rules to text if parser is configured
   */
  private async applyReadingRules(text: string): Promise<string> {
    const parser = await this.getParser();
    if (parser) {
      return parser.parse(text);
    }
    return text;
  }

  // Extract text from cursor position to end of file
  async extractFromCursor(): Promise<string> {
    const [currentLine, lastLine] = await collect(this.denops, (denops) => [
      fn.line(denops, "."),
      fn.line(denops, "$")
    ]);

    const lines = [];
    for (let i = currentLine; i <= lastLine; i++) {
      const line = await fn.getline(this.denops, i);
      lines.push(line);
    }

    const text = lines.join('\n');
    return await this.applyReadingRules(text);
  }

  // Extract text from visual selection
  async extractSelection(): Promise<string> {
    const [startLine, endLine, startCol, endCol] = await collect(this.denops, (denops) => [
      fn.line(denops, "'<"),
      fn.line(denops, "'>"),
      fn.col(denops, "'<"),
      fn.col(denops, "'>")
    ]);

    let text = "";
    if (startLine === endLine) {
      const line = await fn.getline(this.denops, startLine);
      text = line.slice(startCol - 1, endCol);
    } else {
      const lines = [];
      for (let i = startLine; i <= endLine; i++) {
        const line = await fn.getline(this.denops, i);
        if (i === startLine) {
          lines.push(line.slice(startCol - 1));
        } else if (i === endLine) {
          lines.push(line.slice(0, endCol));
        } else {
          lines.push(line);
        }
      }
      text = lines.join('\n');
    }

    return await this.applyReadingRules(text);
  }

  // Extract current line
  async extractCurrentLine(): Promise<string> {
    const text = await fn.getline(this.denops, ".");
    return await this.applyReadingRules(text);
  }
}
