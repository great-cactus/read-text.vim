// Text extraction utilities for Vim/Neovim

import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import { collect } from "https://deno.land/x/denops_std@v6.4.0/batch/mod.ts";

export class TextExtractor {
  private denops: Denops;

  constructor(denops: Denops) {
    this.denops = denops;
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

    return lines.join('\n');
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

    return text;
  }

  // Extract current line
  async extractCurrentLine(): Promise<string> {
    return await fn.getline(this.denops, ".");
  }
}
