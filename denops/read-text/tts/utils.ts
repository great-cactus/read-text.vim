// Utility functions for TTS providers

import type { Config } from "../types.ts";

/**
 * Ensure the temporary directory exists
 */
export async function ensureTempDir(config: Config): Promise<void> {
  try {
    await Deno.mkdir(config.tempDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

/**
 * Create a temporary file path with consistent naming
 */
export function createTempPath(
  config: Config,
  provider: string,
  suffix: string,
  extension: string
): string {
  const timestamp = Date.now();
  const filename = `${config.filePrefix}${provider}_${suffix}_${timestamp}.${extension}`;
  return `${config.tempDir}/${filename}`;
}

/**
 * Safely remove a file, ignoring errors
 */
export async function safeRemove(path: string): Promise<void> {
  try {
    await Deno.remove(path);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Expand ~ to home directory in path
 */
export function expandPath(path: string): string {
  return path.replace(/^~/, Deno.env.get("HOME") || "~");
}

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a command and check if it succeeds
 */
export async function checkCommandExists(
  command: string,
  args: string[]
): Promise<boolean> {
  try {
    const cmd = new Deno.Command(command, {
      args,
      stdout: "null",
      stderr: "null",
    });
    const { success } = await cmd.output();
    return success;
  } catch {
    return false;
  }
}
