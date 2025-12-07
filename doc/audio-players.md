# Audio Players

This plugin uses external audio players to play generated speech.

## Configuration

```vim
let g:read_text_audio_command = 'aplay'   " Command name
let g:read_text_audio_args = ['-q']       " Arguments (file path appended automatically)
```

For Deno built-in audio (experimental):
```vim
let g:read_text_audio_backend = 'deno_audio'
```

---

## aplay (ALSA)

Linux default audio player using ALSA.

### Installation

```bash
# Ubuntu/Debian
sudo apt install alsa-utils

# Arch Linux
sudo pacman -S alsa-utils
```

### Configuration

```vim
let g:read_text_audio_command = 'aplay'
let g:read_text_audio_args = ['-q']
```

### Options

| Option | Description |
|--------|-------------|
| `-q` | Quiet mode (suppress output) |
| `-D <device>` | Select audio device |

### Features

- Lightweight, no dependencies
- Direct ALSA access
- WAV format only

---

## paplay (PulseAudio)

PulseAudio command-line player.

### Installation

```bash
# Ubuntu/Debian
sudo apt install pulseaudio-utils

# Arch Linux
sudo pacman -S pulseaudio
```

### Configuration

```vim
let g:read_text_audio_command = 'paplay'
let g:read_text_audio_args = []
```

### Options

| Option | Description |
|--------|-------------|
| `--volume=<0-65536>` | Set volume |
| `-d <sink>` | Select output sink |

### Features

- PulseAudio/PipeWire integration
- Volume control
- Network audio support

---

## mpv

Versatile cross-platform media player.

### Installation

```bash
# Ubuntu/Debian
sudo apt install mpv

# macOS
brew install mpv

# Windows
winget install mpv
```

### Configuration

```vim
let g:read_text_audio_command = 'mpv'
let g:read_text_audio_args = ['--no-video', '--really-quiet']
```

### Options

| Option | Description |
|--------|-------------|
| `--no-video` | Disable video output |
| `--really-quiet` | Suppress all output |
| `--speed=<0.1-10>` | Playback speed |
| `--volume=<0-100>` | Volume level |
| `--audio-device=<name>` | Select audio device |

### Features

- Cross-platform
- Wide format support (WAV, MP3, OGG, etc.)
- Speed/volume control
- Highly configurable

---

## ffplay (FFmpeg)

FFmpeg-based media player.

### Installation

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
winget install ffmpeg
```

### Configuration

```vim
let g:read_text_audio_command = 'ffplay'
let g:read_text_audio_args = ['-nodisp', '-autoexit', '-loglevel', 'quiet']
```

### Options

| Option | Description |
|--------|-------------|
| `-nodisp` | Disable graphical display |
| `-autoexit` | Exit when playback finished |
| `-loglevel quiet` | Suppress output |
| `-volume <0-100>` | Volume level |
| `-af "atempo=<0.5-2>"` | Playback speed |

### Features

- Cross-platform
- Wide format support
- Part of FFmpeg suite
- Filter support

---

## afplay (macOS)

Built-in macOS audio player.

### Installation

Pre-installed on macOS.

### Configuration

```vim
let g:read_text_audio_command = 'afplay'
let g:read_text_audio_args = []
```

### Options

| Option | Description |
|--------|-------------|
| `-v <0-1>` | Volume (0.0 to 1.0) |
| `-r <rate>` | Playback rate |
| `-q <1-127>` | Audio quality |

### Features

- No installation required on macOS
- Native CoreAudio integration
- Simple and reliable

---

## play (SoX)

SoX (Sound eXchange) command-line player.

### Installation

```bash
# Ubuntu/Debian
sudo apt install sox

# macOS
brew install sox
```

### Configuration

```vim
let g:read_text_audio_command = 'play'
let g:read_text_audio_args = ['-q']
```

### Options

| Option | Description |
|--------|-------------|
| `-q` | Quiet mode |
| `-v <volume>` | Volume multiplier |
| `tempo <factor>` | Playback speed (as effect) |

### Features

- Cross-platform
- Audio effects support
- Wide format support

---

## Platform Recommendations

| Platform | Recommended |
|----------|-------------|
| Linux (ALSA) | aplay |
| Linux (PulseAudio/PipeWire) | paplay or mpv |
| macOS | afplay or mpv |
| Windows | mpv or ffplay |
| Cross-platform | mpv |
