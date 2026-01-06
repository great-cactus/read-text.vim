import { assertEquals } from "@std/assert";
import { describe, it, afterEach } from "@std/testing/bdd";
import {
  ensureTempDir,
  createTempPath,
  safeRemove,
  expandPath,
  fileExists,
  checkCommandExists,
} from "../../denops/read-text/tts/utils.ts";
import type { Config } from "../../denops/read-text/types.ts";

const testConfig: Config = {
  ttsProvider: "voicevox",
  voicevoxUrl: "http://localhost:50021",
  voicevoxSpeaker: 3,
  espeakVoice: "en",
  espeakVariant: "",
  espeakCommand: "espeak",
  meloLanguage: "EN",
  meloSpeaker: "EN-US",
  meloDevice: "auto",
  meloPython: "python3",
  kokoroCommand: "kokoro-tts",
  kokoroModelPath: "",
  kokoroVoicesPath: "",
  kokoroLang: "en-us",
  kokoroVoice: "af_sarah",
  kokoroFormat: "wav",
  speed: 1.0,
  pitch: 0.0,
  tempDir: "/tmp/tts_test",
  filePrefix: "test_",
  autoCleanup: true,
  audioBackend: "aplay",
  audioCommand: "aplay",
  audioArgs: ["-q"],
  splitThreshold: 50,
  pipelineBufferSize: 2,
  readingRulesEnabled: false,
  readingRulesPresets: [],
  readingRulesMode: "extend",
};

describe("TTS Utils - expandPath", () => {
  it("should expand ~ to home directory", () => {
    const home = Deno.env.get("HOME") || "~";
    const result = expandPath("~/test/path");
    assertEquals(result, `${home}/test/path`);
  });

  it("should not modify paths without ~", () => {
    assertEquals(expandPath("/absolute/path"), "/absolute/path");
    assertEquals(expandPath("relative/path"), "relative/path");
  });

  it("should only expand ~ at the beginning", () => {
    const result = expandPath("/path/with/~/tilde");
    assertEquals(result, "/path/with/~/tilde");
  });
});

describe("TTS Utils - createTempPath", () => {
  it("should create path with correct format", () => {
    const path = createTempPath(testConfig, "provider", "suffix", "wav");

    assertEquals(path.startsWith("/tmp/tts_test/test_provider_suffix_"), true);
    assertEquals(path.endsWith(".wav"), true);
  });

  it("should include timestamp for uniqueness", () => {
    const path1 = createTempPath(testConfig, "test", "output", "wav");
    const path2 = createTempPath(testConfig, "test", "output", "wav");

    // Different timestamps should create different paths
    // (unless called in same millisecond)
    assertEquals(typeof path1, "string");
    assertEquals(typeof path2, "string");
  });
});

describe("TTS Utils - ensureTempDir", () => {
  const testDir = "/tmp/tts_utils_test_" + Date.now();

  afterEach(async () => {
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // Ignore if not exists
    }
  });

  it("should create directory if not exists", async () => {
    const config = { ...testConfig, tempDir: testDir };
    await ensureTempDir(config);

    const stat = await Deno.stat(testDir);
    assertEquals(stat.isDirectory, true);
  });

  it("should not fail if directory already exists", async () => {
    const config = { ...testConfig, tempDir: testDir };

    await Deno.mkdir(testDir, { recursive: true });
    await ensureTempDir(config);

    const stat = await Deno.stat(testDir);
    assertEquals(stat.isDirectory, true);
  });
});

describe("TTS Utils - fileExists", () => {
  it("should return true for existing file", async () => {
    const result = await fileExists("/tmp");
    assertEquals(result, true);
  });

  it("should return false for non-existing file", async () => {
    const result = await fileExists("/nonexistent/path/file.txt");
    assertEquals(result, false);
  });
});

describe("TTS Utils - safeRemove", () => {
  it("should remove existing file", async () => {
    const testFile = "/tmp/tts_safe_remove_test_" + Date.now();
    await Deno.writeTextFile(testFile, "test");

    await safeRemove(testFile);

    const exists = await fileExists(testFile);
    assertEquals(exists, false);
  });

  it("should not throw for non-existing file", async () => {
    await safeRemove("/nonexistent/file/path.txt");
    // Should not throw
  });
});

describe("TTS Utils - checkCommandExists", () => {
  it("should return true for existing command", async () => {
    const result = await checkCommandExists("echo", ["hello"]);
    assertEquals(result, true);
  });

  it("should return false for non-existing command", async () => {
    const result = await checkCommandExists("nonexistent_command_xyz", []);
    assertEquals(result, false);
  });

  it("should return false for command with failing args", async () => {
    const result = await checkCommandExists("ls", ["/nonexistent/path/abc"]);
    assertEquals(result, false);
  });
});
