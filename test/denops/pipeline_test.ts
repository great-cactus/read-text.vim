import { assertEquals, assertRejects } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { PipelineController } from "../../denops/read-text/async/pipeline.ts";
import type { TTSProvider } from "../../denops/read-text/tts/provider.ts";
import { AudioPlayer } from "../../denops/read-text/audio/player.ts";
import type { AudioData, TTSOptions } from "../../denops/read-text/types.ts";

// Mock TTS Provider
class MockTTSProvider implements TTSProvider {
  public synthesizeCalls: string[] = [];
  public shouldFail = false;
  public delay = 0;

  async synthesize(text: string, _options?: TTSOptions): Promise<AudioData> {
    if (this.delay > 0) {
      await new Promise((r) => setTimeout(r, this.delay));
    }
    if (this.shouldFail) {
      throw new Error("Synthesis failed");
    }
    this.synthesizeCalls.push(text);
    return { buffer: new ArrayBuffer(100), format: "wav" };
  }

  async checkConnection(): Promise<boolean> {
    return true;
  }
}

// Mock Audio Player - use type assertion for duck typing
interface MockAudioPlayerInterface {
  playedCount: number;
  shouldFail: boolean;
  delay: number;
  playAudio(buffer: ArrayBuffer): Promise<void>;
  stop(): void;
  pause(): boolean;
  resume(): boolean;
  isPaused(): boolean;
}

function createMockAudioPlayer(): MockAudioPlayerInterface & AudioPlayer {
  let _paused = false;
  let _stopped = false;

  const mock = {
    playedCount: 0,
    shouldFail: false,
    delay: 0,

    async playAudio(_buffer: ArrayBuffer): Promise<void> {
      if (_stopped) return;
      if (mock.delay > 0) {
        await new Promise((r) => setTimeout(r, mock.delay));
      }
      if (mock.shouldFail) {
        throw new Error("Playback failed");
      }
      mock.playedCount++;
    },

    stop(): void {
      _stopped = true;
      _paused = false;
    },

    pause(): boolean {
      if (!_paused) {
        _paused = true;
        return true;
      }
      return false;
    },

    resume(): boolean {
      if (_paused) {
        _paused = false;
        return true;
      }
      return false;
    },

    isPaused(): boolean {
      return _paused;
    },
  };

  return mock as unknown as MockAudioPlayerInterface & AudioPlayer;
}

describe("PipelineController - runPipeline", () => {
  let mockProvider: MockTTSProvider;
  let mockPlayer: MockAudioPlayerInterface & AudioPlayer;
  let pipeline: PipelineController;

  beforeEach(() => {
    mockProvider = new MockTTSProvider();
    mockPlayer = createMockAudioPlayer();
    pipeline = new PipelineController(mockProvider, mockPlayer, {
      maxBufferSize: 2,
    });
  });

  it("should process all chunks in order", async () => {
    const chunks = ["chunk1", "chunk2", "chunk3"];

    await pipeline.runPipeline(chunks);

    assertEquals(mockProvider.synthesizeCalls, chunks);
    assertEquals(mockPlayer.playedCount, 3);
  });

  it("should skip empty chunks", async () => {
    const chunks = ["text1", "  ", "text2", "", "text3"];

    await pipeline.runPipeline(chunks);

    assertEquals(mockProvider.synthesizeCalls, ["text1", "text2", "text3"]);
    assertEquals(mockPlayer.playedCount, 3);
  });

  it("should throw if pipeline is already running", async () => {
    mockProvider.delay = 100;

    const firstRun = pipeline.runPipeline(["chunk"]);

    await assertRejects(
      () => pipeline.runPipeline(["another"]),
      Error,
      "Pipeline is already running"
    );

    pipeline.stop();
    await firstRun.catch(() => {});
  });

  it("should handle single chunk", async () => {
    await pipeline.runPipeline(["single"]);

    assertEquals(mockProvider.synthesizeCalls, ["single"]);
    assertEquals(mockPlayer.playedCount, 1);
  });

  it("should handle empty chunks array", async () => {
    await pipeline.runPipeline([]);

    assertEquals(mockProvider.synthesizeCalls, []);
    assertEquals(mockPlayer.playedCount, 0);
  });
});

describe("PipelineController - error handling", () => {
  let mockProvider: MockTTSProvider;
  let mockPlayer: MockAudioPlayerInterface & AudioPlayer;
  let pipeline: PipelineController;

  beforeEach(() => {
    mockProvider = new MockTTSProvider();
    mockPlayer = createMockAudioPlayer();
    pipeline = new PipelineController(mockProvider, mockPlayer, {
      maxBufferSize: 2,
    });
  });

  it("should handle synthesis errors", async () => {
    mockProvider.shouldFail = true;

    await assertRejects(
      () => pipeline.runPipeline(["chunk"]),
      Error,
      "Synthesis failed"
    );
  });

  it("should handle playback errors", async () => {
    mockPlayer.shouldFail = true;

    await assertRejects(
      () => pipeline.runPipeline(["chunk"]),
      Error,
      "Playback failed"
    );
  });

  it("should not be running after error", async () => {
    mockProvider.shouldFail = true;

    try {
      await pipeline.runPipeline(["chunk"]);
    } catch {
      // Expected
    }

    assertEquals(pipeline.isActive(), false);
  });
});

describe("PipelineController - stop", () => {
  let mockProvider: MockTTSProvider;
  let mockPlayer: MockAudioPlayerInterface & AudioPlayer;
  let pipeline: PipelineController;

  beforeEach(() => {
    mockProvider = new MockTTSProvider();
    mockPlayer = createMockAudioPlayer();
    pipeline = new PipelineController(mockProvider, mockPlayer, {
      maxBufferSize: 2,
    });
  });

  it("should stop pipeline execution", async () => {
    mockProvider.delay = 50;
    mockPlayer.delay = 50;

    const chunks = ["c1", "c2", "c3", "c4", "c5"];
    const runPromise = pipeline.runPipeline(chunks);

    await new Promise((r) => setTimeout(r, 80));
    pipeline.stop();

    await runPromise;

    assertEquals(mockProvider.synthesizeCalls.length < 5, true);
  });

  it("should be safe to call stop when not running", () => {
    pipeline.stop();
    assertEquals(pipeline.isActive(), false);
  });
});

describe("PipelineController - pause/resume", () => {
  let mockProvider: MockTTSProvider;
  let mockPlayer: MockAudioPlayerInterface & AudioPlayer;
  let pipeline: PipelineController;

  beforeEach(() => {
    mockProvider = new MockTTSProvider();
    mockPlayer = createMockAudioPlayer();
    pipeline = new PipelineController(mockProvider, mockPlayer, {
      maxBufferSize: 2,
    });
  });

  it("should return false when not running", () => {
    assertEquals(pipeline.pause(), false);
    assertEquals(pipeline.resume(), false);
  });

  it("should report isPaused correctly", () => {
    assertEquals(pipeline.isPaused(), false);
  });
});

describe("PipelineController - isActive", () => {
  let mockProvider: MockTTSProvider;
  let mockPlayer: MockAudioPlayerInterface & AudioPlayer;
  let pipeline: PipelineController;

  beforeEach(() => {
    mockProvider = new MockTTSProvider();
    mockPlayer = createMockAudioPlayer();
    pipeline = new PipelineController(mockProvider, mockPlayer, {
      maxBufferSize: 2,
    });
  });

  it("should return false when not running", () => {
    assertEquals(pipeline.isActive(), false);
  });

  it("should return true while running", async () => {
    mockProvider.delay = 100;

    assertEquals(pipeline.isActive(), false);

    const runPromise = pipeline.runPipeline(["chunk"]);
    assertEquals(pipeline.isActive(), true);

    pipeline.stop();
    await runPromise;

    assertEquals(pipeline.isActive(), false);
  });
});
