# TTS Providers

## kokoro-tts

High-quality offline TTS with multi-language support.

### Installation

```bash
# Install kokoro-tts (see https://github.com/nazdridoy/kokoro-tts)

# Download model files
mkdir -p ~/.local/share/kokoro-tts
cd ~/.local/share/kokoro-tts
wget https://github.com/nazdridoy/kokoro-tts/releases/download/v1.0.0/kokoro-v1.0.onnx
wget https://github.com/nazdridoy/kokoro-tts/releases/download/v1.0.0/voices-v1.0.bin
```

### Configuration

```vim
let g:read_text_tts_provider = 'kokoro'
let g:read_text_kokoro_command = 'kokoro-tts'
let g:read_text_kokoro_model_path = '~/.local/share/kokoro-tts/kokoro-v1.0.onnx'
let g:read_text_kokoro_voices_path = '~/.local/share/kokoro-tts/voices-v1.0.bin'
let g:read_text_kokoro_lang = 'en-us'    " en-us, en-gb, ja, cmn, fr-fr, it
let g:read_text_kokoro_voice = 'af_sarah'
let g:read_text_kokoro_format = 'wav'    " wav or mp3
```

### Available Voices

```bash
kokoro-tts --help-voices
```

| Language | Female | Male |
|----------|--------|------|
| en-us | af_sarah, af_bella, af_nicole | am_adam, am_michael |
| en-gb | bf_alice, bf_emma | bm_daniel, bm_george |
| ja | jf_alpha, jf_gongitsune | jm_kumo |

---

## VOICEVOX

High-quality Japanese TTS (requires running server).

### Installation

Download from https://voicevox.hiroshiba.jp/ and start the engine:

```bash
./voicevox_engine
```

### Configuration

```vim
let g:read_text_tts_provider = 'voicevox'
let g:read_text_voicevox_url = 'http://localhost:50021'
let g:read_text_voicevox_speaker = 3  " Speaker ID
```

---

## espeak

Lightweight multi-language TTS.

### Installation

```bash
# Ubuntu/Debian
sudo apt install espeak-ng

# macOS
brew install espeak-ng
```

### Configuration

```vim
let g:read_text_tts_provider = 'espeak'
let g:read_text_espeak_command = 'espeak-ng'  " or 'espeak'
let g:read_text_espeak_voice = 'en'           " Language code
let g:read_text_espeak_variant = 'f2'         " m1-m7 (male), f1-f4 (female)
```

### Available Voices

```bash
espeak-ng --voices
```

---

## MeloTTS

High-quality multi-language TTS (requires Python).

### Installation

```bash
pip install git+https://github.com/myshell-ai/MeloTTS.git
```

### Configuration

```vim
let g:read_text_tts_provider = 'melo'
let g:read_text_melo_language = 'EN'   " EN, JP, ES, FR, CN, KR
let g:read_text_melo_speaker = 'EN-US' " EN-US, EN-BR, EN-AU, JP, etc.
let g:read_text_melo_device = 'auto'   " auto, cpu, cuda
let g:read_text_melo_python = 'python3'
```

---

## Common Settings

These settings apply to all providers:

```vim
let g:read_text_speed = 1.0           " 0.5-2.0
let g:read_text_pitch = 0.0           " -1.0 to 1.0
let g:read_text_temp_dir = './.tmp'
let g:read_text_auto_cleanup = 1
let g:read_text_audio_backend = 'aplay'
let g:read_text_split_threshold = 50  " Lines per chunk
```
