# Troubleshooting

## General Issues

### No sound

1. Check TTS engine is installed and configured correctly
2. Check audio device is working: `aplay /usr/share/sounds/alsa/Front_Center.wav`
3. Check temp directory is writable

### denops errors

Restart Vim/Neovim:
```vim
:qa
```

---

## WSL Issues

### Audio not working

```bash
# Check WSLg PulseAudio
echo $PULSE_SERVER
ls -la /mnt/wslg/PulseServer

# Restart WSL if needed
wsl --shutdown
```

### Fallback to aplay

```vim
let g:read_text_audio_backend = 'aplay'
```

---

## Provider-Specific Issues

### kokoro-tts

```bash
# Check installation
which kokoro-tts
kokoro-tts --help

# Check model files
ls -lh ~/.local/share/kokoro-tts/
```

### VOICEVOX

```vim
" Check connection
:ReadTextCheckConnection
```

### espeak

```bash
# Check installation
espeak-ng --version
espeak-ng --voices
```

### MeloTTS

```bash
# Check Python module
python3 -c "from melo.api import TTS; print('OK')"
```

If CUDA errors occur:
```vim
let g:read_text_melo_device = 'cpu'
```

---

## Performance

For long texts, reduce chunk size:

```vim
let g:read_text_split_threshold = 30
```
