# read-text.vim

VOICEVOXを使用してVim/Neovim内でテキストを音声読み上げするプラグイン

## 概要

このプラグインは,Vim/Neovim内のテキストをVOICEVOXで音声合成し,読み上げる機能を提供します.denops.vimを使用してTypeScriptで実装されており,高性能で安定した非同期処理を実現しています.

## 主要機能

- **カーソル位置以下の読み上げ**: 現在のカーソル位置から文書の最後まで読み上げ
- **Visual選択範囲の読み上げ**: 選択されたテキスト範囲を読み上げ
- **現在行の読み上げ**: カーソルがある行のみを読み上げ
- **非同期処理**: 読み上げ中もVimの操作が可能
- **自動分割処理**: 長いテキストを自動的に分割して処理
- **多彩な設定**: 話者,速度,ピッチなどをカスタマイズ可能

## 必要要件

- Vim 8.2+ または Neovim 0.5+
- [denops.vim](https://github.com/vim-denops/denops.vim)
- [Deno](https://deno.land/) 1.40+
- [VOICEVOX](https://voicevox.hiroshiba.jp/) サーバー

## インストール

### 1. Denoのインストール

```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 2. プラグインのインストール

#### vim-plugを使用する場合

```vim
Plug 'vim-denops/denops.vim'
Plug 'your-username/read-text.vim'
```

#### packerを使用する場合

```lua
use {
  'your-username/read-text.vim',
  requires = 'vim-denops/denops.vim'
}
```

### 3. VOICEVOXサーバーの起動

```bash
# VOICEVOXアプリケーションを起動するか,エンジンを直接起動
./voicevox_engine
```

## 使用方法

### 基本コマンド

| コマンド | 説明 |
|----------|------|
| `:ReadFromCursor` | カーソル位置以下を読み上げ |
| `:ReadSelection` | Visual選択範囲を読み上げ |
| `:ReadLine` | 現在行を読み上げ |
| `:ReadTextCheckConnection` | VOICEVOX接続確認 |

### オプション付きコマンド

```vim
" 指定した話者IDで読み上げ
:ReadFromCursor 1
:ReadSelection 14
:ReadLine 3
```

### 推奨キーマッピング

```vim
" デフォルトマッピングを有効にする
let g:read_text_enable_default_mappings = 1

" または手動で設定
nnoremap <leader>rs :ReadFromCursor<CR>
vnoremap <leader>rs :ReadSelection<CR>
nnoremap <leader>rl :ReadLine<CR>
```

## 設定項目

### VOICEVOX設定

```vim
" VOICEVOXサーバーURL（デフォルト: http://localhost:50021）
let g:read_text_voicevox_url = 'http://localhost:50021'

" 話者ID（デフォルト: 3 = ずんだもん）
let g:read_text_speaker_id = 3

" 音声速度（0.5-2.0, デフォルト: 1.0）
let g:read_text_speed_scale = 1.0

" ピッチ調整（-0.15-0.15, デフォルト: 0.0）
let g:read_text_pitch_scale = 0.0
```

### ファイル管理設定

```vim
" 一時ファイル保存ディレクトリ（デフォルト: ./.tmp）
let g:read_text_temp_dir = './.tmp'

" ファイル名プレフィックス（デフォルト: vim_tts_）
let g:read_text_file_prefix = 'vim_tts_'

" 自動削除（デフォルト: 1）
let g:read_text_auto_cleanup = 1
```

### 音声再生設定

```vim
" 音声再生方式（デフォルト: deno_audio）
let g:read_text_audio_backend = 'deno_audio'

" テキスト分割閾値（デフォルト: 50行）
let g:read_text_split_threshold = 50
```
## トラブルシューティング

### VOICEVOX接続エラー

```vim
:ReadTextCheckConnection
```

でVOICEVOXサーバーとの接続を確認してください.

### 音声が再生されない

1. VOICEVOXサーバーが起動していることを確認
2. 音声デバイスが正常に動作していることを確認
3. 一時ディレクトリの書き込み権限を確認

### パフォーマンスの問題

長いテキストの場合は分割閾値を調整してください：

```vim
let g:read_text_split_threshold = 30  " より細かく分割
```

## ライセンス

zlib License

## 貢献

プルリクエストやイシューの報告を歓迎します.
