# read-text.vim

Vim/Neovim内でテキストを音声読み上げするプラグイン（VOICEVOX / espeak / MeloTTS対応）

## 概要

このプラグインは,Vim/Neovim内のテキストを音声合成し,読み上げる機能を提供します.denops.vimを使用してTypeScriptで実装されており,高性能で安定した非同期処理を実現しています.

複数のTTSエンジンに対応しており,環境に応じて選択できます:
- **VOICEVOX**: 高品質な日本語音声合成（サーバー起動が必要）
- **espeak/espeak-ng**: 軽量で多言語対応のTTS（コマンドライン実行）
- **MeloTTS**: 高品質で多言語対応のTTS（Python API経由）
- **kokoro-tts**: 高品質でオフライン対応のTTS（コマンドライン実行）

## 主要機能

- **カーソル位置以下の読み上げ**: 現在のカーソル位置から文書の最後まで読み上げ
- **Visual選択範囲の読み上げ**: 選択されたテキスト範囲を読み上げ
- **現在行の読み上げ**: カーソルがある行のみを読み上げ
- **非同期処理**: 読み上げ中もVimの操作が可能
- **自動分割処理**: 長いテキストを自動的に分割して処理
- **多彩な設定**: 話者,速度,ピッチなどをカスタマイズ可能
- **複数TTS対応**: VOICEVOX, espeak, MeloTTS, kokoro-ttsから選択可能

## 必要要件

### 共通要件

- Vim 8.2+ または Neovim 0.5+
- [denops.vim](https://github.com/vim-denops/denops.vim)
- [Deno](https://deno.land/) 1.40+

### TTSエンジン（いずれか）

- [VOICEVOX](https://voicevox.hiroshiba.jp/) サーバー（高品質な日本語音声）
- espeak または espeak-ng（軽量・多言語対応）
- [MeloTTS](https://github.com/myshell-ai/MeloTTS)（高品質・多言語対応,Python必須）
- [kokoro-tts](https://github.com/nazdridoy/kokoro-tts)（高品質・オフライン対応）

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

### 3. TTSエンジンのインストール

#### VOICEVOX（デフォルト）

```bash
# VOICEVOXアプリケーションをダウンロード・インストール
# https://voicevox.hiroshiba.jp/

# サーバーを起動
./voicevox_engine
```

#### espeak/espeak-ng

**Linux (Ubuntu/Debian):**
```bash
# espeak
sudo apt install espeak

# または espeak-ng（推奨）
sudo apt install espeak-ng
```

**macOS:**
```bash
# Homebrew経由
brew install espeak

# または espeak-ng
brew install espeak-ng
```

**Windows:**
```powershell
# Chocolatey経由
choco install espeak

# または公式サイトからダウンロード
# http://espeak.sourceforge.net/
```

#### MeloTTS

**Python環境が必要です:**
```bash
# MeloTTSのインストール
pip install git+https://github.com/myshell-ai/MeloTTS.git

# または,ローカルでクローンしてインストール
git clone https://github.com/myshell-ai/MeloTTS.git
cd MeloTTS
pip install -e .

# 必要なモデルのダウンロードは初回実行時に自動で行われます
```

#### kokoro-tts

```bash
# kokoro-ttsのインストール（詳細は公式リポジトリ参照）
# https://github.com/nazdridoy/kokoro-tts

# モデルファイルのダウンロード
mkdir -p ~/.local/share/kokoro-tts
cd ~/.local/share/kokoro-tts
wget https://github.com/nazdridoy/kokoro-tts/releases/download/v1.0.0/kokoro-v1.0.onnx
wget https://github.com/nazdridoy/kokoro-tts/releases/download/v1.0.0/voices-v1.0.bin

# 動作確認
kokoro-tts --help-languages
kokoro-tts --help-voices
```

## 使用方法

### 基本コマンド

| コマンド | 説明 |
|----------|------|
| `:ReadFromCursor` | カーソル位置以下を読み上げ |
| `:ReadSelection` | Visual選択範囲を読み上げ |
| `:ReadLine` | 現在行を読み上げ |
| `:ReadTextCheckConnection` | TTS接続確認 |

### オプション付きコマンド

```vim
" 指定した話者ID/voiceで読み上げ（VOICEVOXの場合）
:ReadFromCursor 1
:ReadSelection 14
:ReadLine 3
```

### キーマッピング

#### <Plug>マッピング（推奨）

```vim
" 基本機能
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
nmap <leader>rl <Plug>(read-text-line)
nmap <leader>rc <Plug>(read-text-check-connection)

" 非同期版
nmap <leader>as <Plug>(read-text-from-cursor-async)
vmap <leader>as <Plug>(read-text-selection-async)
nmap <leader>al <Plug>(read-text-line-async)
```

#### デフォルトマッピング

```vim
" 自動的にデフォルトマッピングを有効にする
let g:read_text_enable_default_mappings = 1
```

#### 利用可能な<Plug>マッピング

| <Plug>マッピング | 機能 |
|------------------|------|
| `<Plug>(read-text-from-cursor)` | カーソル位置以下を読み上げ |
| `<Plug>(read-text-selection)` | Visual選択範囲を読み上げ |
| `<Plug>(read-text-line)` | 現在行を読み上げ |
| `<Plug>(read-text-check-connection)` | TTS接続確認 |
| `<Plug>(read-text-from-cursor-async)` | カーソル位置以下を非同期読み上げ |
| `<Plug>(read-text-selection-async)` | Visual選択範囲を非同期読み上げ |
| `<Plug>(read-text-line-async)` | 現在行を非同期読み上げ |

## 設定項目

### TTSプロバイダー選択

```vim
" TTSエンジンの選択（デフォルト: 'voicevox'）
let g:read_text_tts_provider = 'voicevox'  " または 'espeak', 'melo', 'kokoro'
```

### VOICEVOX設定

```vim
" VOICEVOXサーバーURL（デフォルト: http://localhost:50021）
let g:read_text_voicevox_url = 'http://localhost:50021'

" 話者ID（デフォルト: 3 = ずんだもん）
let g:read_text_voicevox_speaker = 3
```

### espeak設定

```vim
" 言語コード（デフォルト: 'en'）
" 日本語: 'ja', 英語: 'en', フランス語: 'fr', など
let g:read_text_espeak_voice = 'en'

" 声のバリエーション（デフォルト: ''）
" 男性: 'm1'-'m7', 女性: 'f1'-'f4', 空文字列でデフォルト
let g:read_text_espeak_variant = 'f2'

" espeakコマンド名（デフォルト: 'espeak'）
let g:read_text_espeak_command = 'espeak'  " または 'espeak-ng'
```

### MeloTTS設定

```vim
" 言語（デフォルト: 'EN'）
" 対応言語: EN (英語), JP (日本語), ES (スペイン語), FR (フランス語), CN (中国語), KR (韓国語)
let g:read_text_melo_language = 'EN'

" スピーカー（デフォルト: 'EN-US'）
" 英語: EN-US, EN-BR, EN-AU, EN-INDIA
" 日本語: JP
" その他の言語も対応（MeloTTSドキュメント参照）
let g:read_text_melo_speaker = 'EN-US'

" デバイス（デフォルト: 'auto'）
" auto (GPUがあれば使用), cpu, cuda
let g:read_text_melo_device = 'auto'

" Pythonコマンド（デフォルト: 'python3'）
let g:read_text_melo_python = 'python3'
```

### kokoro-tts設定

```vim
" kokoro-ttsコマンド名（デフォルト: 'kokoro-tts'）
let g:read_text_kokoro_command = 'kokoro-tts'

" モデルファイルパス（デフォルト: ~/.local/share/kokoro-tts/kokoro-v1.0.onnx）
let g:read_text_kokoro_model_path = '~/.local/share/kokoro-tts/kokoro-v1.0.onnx'

" 声データファイルパス（デフォルト: ~/.local/share/kokoro-tts/voices-v1.0.bin）
let g:read_text_kokoro_voices_path = '~/.local/share/kokoro-tts/voices-v1.0.bin'

" 言語（デフォルト: 'en-us'）
" サポート: en-us, en-gb, ja, cmn, fr-fr, it
let g:read_text_kokoro_lang = 'en-us'

" 声（デフォルト: 'af_sarah'）
" 利用可能な声: kokoro-tts --help-voices で確認
" アメリカ英語女性: af_sarah, af_bella, af_nicole
" アメリカ英語男性: am_adam, am_michael, am_liam
" イギリス英語女性: bf_alice, bf_emma, bf_isabella
" イギリス英語男性: bm_daniel, bm_george, bm_lewis
" 日本語女性: jf_alpha, jf_gongitsune, jf_nezumi
" 日本語男性: jm_kumo
let g:read_text_kokoro_voice = 'af_sarah'

" 出力フォーマット（デフォルト: 'wav'）
" サポート: wav, mp3
let g:read_text_kokoro_format = 'wav'
```

### 共通設定（正規化された値）

```vim
" 音声速度（0.5-2.0, デフォルト: 1.0）
let g:read_text_speed = 1.0

" ピッチ調整（-1.0-1.0, デフォルト: 0.0）
let g:read_text_pitch = 0.0
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

## 典型的な設定例

### VOICEVOX使用（高品質な日本語音声）

```vim
" VOICEVOXを使用
let g:read_text_tts_provider = 'voicevox'
let g:read_text_voicevox_speaker = 3  " ずんだもん
let g:read_text_speed = 1.2           " 少し速め
let g:read_text_pitch = 0.0

" キーマッピング
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
```

### espeak使用（英語文書, 女性の声）

```vim
" espeakを使用
let g:read_text_tts_provider = 'espeak'
let g:read_text_espeak_voice = 'en'
let g:read_text_espeak_variant = 'f2'  " 女性の声
let g:read_text_espeak_command = 'espeak-ng'
let g:read_text_speed = 1.0
let g:read_text_pitch = 0.1            " 少し高め

" キーマッピング
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
```

### espeak使用（日本語文書, 男性の声）

```vim
" espeakで日本語
let g:read_text_tts_provider = 'espeak'
let g:read_text_espeak_voice = 'ja'
let g:read_text_espeak_variant = 'm3'  " 男性の声
let g:read_text_speed = 0.9            " 少し遅め
let g:read_text_pitch = -0.1           " 少し低め

" キーマッピング
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
```

### MeloTTS使用（英語文書, アメリカ英語）

```vim
" MeloTTSを使用
let g:read_text_tts_provider = 'melo'
let g:read_text_melo_language = 'EN'
let g:read_text_melo_speaker = 'EN-US'
let g:read_text_melo_device = 'auto'   " GPUがあれば使用
let g:read_text_speed = 1.0

" キーマッピング
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
```

### MeloTTS使用（日本語文書）

```vim
" MeloTTSで日本語
let g:read_text_tts_provider = 'melo'
let g:read_text_melo_language = 'JP'
let g:read_text_melo_speaker = 'JP'
let g:read_text_melo_device = 'cpu'    " CPU使用
let g:read_text_melo_python = 'python3'
let g:read_text_speed = 1.1            " 少し速め

" キーマッピング
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
```

### kokoro-tts使用（英語文書, アメリカ英語女性の声）

```vim
" kokoro-ttsを使用
let g:read_text_tts_provider = 'kokoro'
let g:read_text_kokoro_lang = 'en-us'
let g:read_text_kokoro_voice = 'af_sarah'
let g:read_text_speed = 1.0

" キーマッピング
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
```

### kokoro-tts使用（日本語文書）

```vim
" kokoro-ttsで日本語
let g:read_text_tts_provider = 'kokoro'
let g:read_text_kokoro_lang = 'ja'
let g:read_text_kokoro_voice = 'jf_alpha'
let g:read_text_speed = 1.0

" キーマッピング
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
```

### kokoro-tts使用（イギリス英語）

```vim
" kokoro-ttsでイギリス英語
let g:read_text_tts_provider = 'kokoro'
let g:read_text_kokoro_lang = 'en-gb'
let g:read_text_kokoro_voice = 'bf_alice'
let g:read_text_speed = 1.1

" キーマッピング
nmap <leader>rs <Plug>(read-text-from-cursor)
vmap <leader>rs <Plug>(read-text-selection)
```

### 後方互換性

古い変数名も引き続き使用できます:

```vim
" 古い変数名 -> 新しい変数名
let g:read_text_speaker_id = 3       " -> g:read_text_voicevox_speaker
let g:read_text_speed_scale = 1.0    " -> g:read_text_speed
let g:read_text_pitch_scale = 0.0    " -> g:read_text_pitch
```

## トラブルシューティング

### denopsエラー

もしdenopsの初期化でエラーが発生する場合：

```vim
" Vim/Neovimを再起動
:qa
```

### deno_audioエラー

deno_audioライブラリでエラーが発生する場合の対処法：

#### WSL環境の場合
```bash
# WSLgの確認
echo $PULSE_SERVER
ls -la /mnt/wslg/PulseServer

# WSLの再起動
wsl --shutdown
```

#### 一般的な対処法
```vim
" aplayにフォールバック
let g:read_text_audio_backend = 'aplay'

" 詳細な実行（デバッグ用）
:ReadTextCheckConnection
```

### VOICEVOX接続エラー

```vim
:ReadTextCheckConnection
```

でVOICEVOXサーバーとの接続を確認してください.

### espeak関連エラー

#### espeakがインストールされているか確認

```bash
# espeakのバージョン確認
espeak --version

# または espeak-ng
espeak-ng --version
```

#### 利用可能な音声の確認

```bash
# 利用可能な言語と音声を表示
espeak --voices

# または espeak-ng
espeak-ng --voices
```

#### コマンド名の設定

システムによってはespeak-ngがインストールされている場合があります:

```vim
let g:read_text_espeak_command = 'espeak-ng'
```

### MeloTTS関連エラー

#### MeloTTSがインストールされているか確認

```bash
# Pythonで確認
python3 -c "from melo.api import TTS; print('MeloTTS is installed')"
```

#### 初回実行時のモデルダウンロード

初回実行時,MeloTTSは必要なモデルを自動的にダウンロードします.インターネット接続を確認してください.

#### Pythonコマンドの確認

システムによってはPythonコマンドが異なる場合があります:

```vim
" python3が使えない場合
let g:read_text_melo_python = 'python'
```

#### GPU/CUDA関連エラー

CUDAエラーが発生する場合,CPUを使用するように設定:

```vim
let g:read_text_melo_device = 'cpu'
```

### kokoro-tts関連エラー

#### kokoro-ttsがインストールされているか確認

```bash
# コマンドの確認
which kokoro-tts

# ヘルプ確認
kokoro-tts --help
```

#### モデルファイルの確認

```bash
# モデルファイルの存在確認
ls -lh ~/.local/share/kokoro-tts/
```

#### 利用可能な言語と声の確認

```bash
# サポート言語
kokoro-tts --help-languages --model ~/.local/share/kokoro-tts/kokoro-v1.0.onnx --voices ~/.local/share/kokoro-tts/voices-v1.0.bin

# 利用可能な声
kokoro-tts --help-voices --model ~/.local/share/kokoro-tts/kokoro-v1.0.onnx --voices ~/.local/share/kokoro-tts/voices-v1.0.bin
```

#### モデルファイルが見つからない場合

```bash
# モデルファイルのダウンロード
mkdir -p ~/.local/share/kokoro-tts
cd ~/.local/share/kokoro-tts
wget https://github.com/nazdridoy/kokoro-tts/releases/download/v1.0.0/kokoro-v1.0.onnx
wget https://github.com/nazdridoy/kokoro-tts/releases/download/v1.0.0/voices-v1.0.bin
```

#### モデルパスのカスタマイズ

```vim
" カスタムパスを指定
let g:read_text_kokoro_model_path = '/path/to/kokoro-v1.0.onnx'
let g:read_text_kokoro_voices_path = '/path/to/voices-v1.0.bin'
```

### 音声が再生されない

1. TTSエンジンが正しく設定されていることを確認
   - VOICEVOX: サーバーが起動していることを確認
   - espeak: コマンドがインストールされていることを確認
   - MeloTTS: Pythonとライブラリがインストールされていることを確認
   - kokoro-tts: コマンドとモデルファイルがインストールされていることを確認
2. 音声デバイスが正常に動作していることを確認
3. 一時ディレクトリの書き込み権限を確認

### パフォーマンスの問題

長いテキストの場合は分割閾値を調整してください：

```vim
let g:read_text_split_threshold = 30  " より細かく分割
```

## TODO
- [ ] 読み上げ位置をカーソルで追跡
- [ ] 読み上げキャンセル機能追加
- [ ] 読み上げの重複を防ぐ
- [ ] 読み上げ速度のライブ変更

## ライセンス

zlib License

## 貢献

プルリクエストやイシューの報告を歓迎します.
