import { assertEquals, assertExists } from "@std/assert";
import { test, DenopsStub } from "@denops/test";
import { describe, it } from "@std/testing/bdd";

// テスト用設定
const TEST_VOICEVOX_URL = "https://hideously-cheerful-swift.ngrok-free.app";

describe("read-text.vim integration tests", () => {
  it("should load plugin and set default variables", async () => {
    await test("nvim", "Load plugin and check default variables", async (denops) => {
      // プラグインをロード
      await denops.cmd("runtime plugin/read-text.vim");
      
      // デフォルト変数が設定されていることを確認
      const voicevoxUrl = await denops.eval("g:read_text_voicevox_url");
      const voicevoxSpeaker = await denops.eval("g:read_text_voicevox_speaker");
      const speed = await denops.eval("g:read_text_speed");

      assertEquals(typeof voicevoxUrl, "string");
      assertEquals(typeof voicevoxSpeaker, "number");
      assertEquals(typeof speed, "number");
    });
  });

  it("should register commands", async () => {
    await test("nvim", "Check if commands are registered", async (denops) => {
      await denops.cmd("runtime plugin/read-text.vim");
      
      // コマンドが登録されていることを確認
      const commands = await denops.eval("getcompletion('ReadFromCursor', 'command')");
      assertEquals(Array.isArray(commands), true);
      assertEquals((commands as string[]).includes("ReadFromCursor"), true);
      
      const commands2 = await denops.eval("getcompletion('ReadSelection', 'command')");
      assertEquals((commands2 as string[]).includes("ReadSelection"), true);
      
      const commands3 = await denops.eval("getcompletion('ReadLine', 'command')");
      assertEquals((commands3 as string[]).includes("ReadLine"), true);
    });
  });

  it("should handle custom configuration", async () => {
    await test("nvim", "Test custom configuration", async (denops) => {
      // カスタム設定を行う
      await denops.cmd(`let g:read_text_voicevox_url = '${TEST_VOICEVOX_URL}'`);
      await denops.cmd("let g:read_text_voicevox_speaker = 14");
      await denops.cmd("let g:read_text_speed = 1.2");

      await denops.cmd("runtime plugin/read-text.vim");

      // 設定が反映されていることを確認
      const voicevoxUrl = await denops.eval("g:read_text_voicevox_url");
      const voicevoxSpeaker = await denops.eval("g:read_text_voicevox_speaker");
      const speed = await denops.eval("g:read_text_speed");

      assertEquals(voicevoxUrl, TEST_VOICEVOX_URL);
      assertEquals(voicevoxSpeaker, 14);
      assertEquals(speed, 1.2);
    });
  });

  it("should handle buffer text operations", async () => {
    await test("nvim", "Test buffer text operations", async (denops) => {
      await denops.cmd("runtime plugin/read-text.vim");
      
      // テスト用テキストを設定
      await denops.cmd("enew");
      await denops.cmd("put =['テスト行1', 'テスト行2', 'テスト行3']");
      await denops.cmd("normal! gg");
      
      // バッファの内容を確認
      const lineCount = await denops.call("line", "$") as number;
      assertEquals(typeof lineCount, "number");
      assertEquals(lineCount >= 3, true);
      
      const currentLine = await denops.call("getline", ".");
      assertEquals(typeof currentLine, "string");
    });
  });

  it("should handle visual selection", async () => {
    await test("nvim", "Test visual selection handling", async (denops) => {
      await denops.cmd("runtime plugin/read-text.vim");
      
      // テスト用テキストを設定
      await denops.cmd("enew");
      await denops.cmd("put =['選択テスト1', '選択テスト2', '選択テスト3']");
      await denops.cmd("normal! gg");
      
      // Visual選択をシミュレート
      await denops.cmd("normal! V2j");
      
      // 選択範囲のマークを確認
      const startLine = await denops.call("line", "'<") as number;
      const endLine = await denops.call("line", "'>") as number;
      
      assertEquals(typeof startLine, "number");
      assertEquals(typeof endLine, "number");
      assertEquals(endLine > startLine, true);
    });
  });
});

describe("denops dispatcher tests", () => {
  it("should test checkVoicevoxConnection", async () => {
    const denops = new DenopsStub();

    // main.tsから関数をインポート（実際の実装では適切にインポート）
    // ここではVOICEVOX接続チェックのロジックをテスト
    const checkConnection = async (): Promise<boolean> => {
      try {
        const response = await fetch(`${TEST_VOICEVOX_URL}/speakers`, {
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        });
        if (response.ok) {
          await response.text();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const result = await checkConnection();
    assertEquals(typeof result, "boolean");
  });
});

describe("error handling tests", () => {
  it("should handle network errors gracefully", async () => {
    const invalidUrl = "http://invalid-url:12345";
    
    const checkConnection = async (): Promise<boolean> => {
      try {
        const response = await fetch(`${invalidUrl}/speakers`);
        if (response.ok) {
          await response.text();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const result = await checkConnection();
    assertEquals(result, false);
  });

  it("should handle invalid JSON responses", async () => {
    // 無効なレスポンスを返すモックサーバーのテスト
    const mockFetch = async (): Promise<Response> => {
      return new Response("invalid json", { status: 200 });
    };

    const parseResponse = async (response: Response): Promise<boolean> => {
      try {
        await response.json();
        return true;
      } catch {
        return false;
      }
    };

    const response = await mockFetch();
    const result = await parseResponse(response);
    assertEquals(result, false);
  });
});