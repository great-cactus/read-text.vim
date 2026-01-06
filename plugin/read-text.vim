if exists('g:loaded_read_text')
  finish
endif
let g:loaded_read_text = 1

" デフォルト設定

" TTS provider selection (default: voicevox)
if !exists('g:read_text_tts_provider')
  let g:read_text_tts_provider = 'voicevox'
endif

" VOICEVOX settings
if !exists('g:read_text_voicevox_url')
  let g:read_text_voicevox_url = 'http://localhost:50021'
endif

if !exists('g:read_text_voicevox_speaker')
  let g:read_text_voicevox_speaker = 3
endif

" espeak settings
if !exists('g:read_text_espeak_voice')
  let g:read_text_espeak_voice = 'en'
endif

if !exists('g:read_text_espeak_variant')
  " Voice variant: 'm1'-'m7' (male), 'f1'-'f4' (female), or '' (default)
  let g:read_text_espeak_variant = ''
endif

if !exists('g:read_text_espeak_command')
  let g:read_text_espeak_command = 'espeak'
endif

" MeloTTS settings
if !exists('g:read_text_melo_language')
  " Language: EN, JP, ES, FR, CN, KR
  let g:read_text_melo_language = 'EN'
endif

if !exists('g:read_text_melo_speaker')
  " Speaker: EN-US, EN-BR, EN-AU, EN-INDIA, JP, etc.
  let g:read_text_melo_speaker = 'EN-US'
endif

if !exists('g:read_text_melo_device')
  " Device: auto, cpu, cuda
  let g:read_text_melo_device = 'auto'
endif

if !exists('g:read_text_melo_python')
  " Python command: python, python3
  let g:read_text_melo_python = 'python3'
endif

" kokoro-tts settings
if !exists('g:read_text_kokoro_command')
  let g:read_text_kokoro_command = 'kokoro-tts'
endif

if !exists('g:read_text_kokoro_model_path')
  " Path to kokoro-v1.0.onnx model file
  let g:read_text_kokoro_model_path = '~/.local/share/kokoro-tts/kokoro-v1.0.onnx'
endif

if !exists('g:read_text_kokoro_voices_path')
  " Path to voices-v1.0.bin file
  let g:read_text_kokoro_voices_path = '~/.local/share/kokoro-tts/voices-v1.0.bin'
endif

if !exists('g:read_text_kokoro_lang')
  " Language: en-us, en-gb, ja, cmn, fr-fr, it
  let g:read_text_kokoro_lang = 'en-us'
endif

if !exists('g:read_text_kokoro_voice')
  " Voice: af_sarah, bf_alice, jf_alpha, am_adam, etc.
  let g:read_text_kokoro_voice = 'af_sarah'
endif

if !exists('g:read_text_kokoro_format')
  " Audio format: wav or mp3
  let g:read_text_kokoro_format = 'wav'
endif

" Common settings (normalized values)
if !exists('g:read_text_speed')
  let g:read_text_speed = 1.0
endif

if !exists('g:read_text_pitch')
  let g:read_text_pitch = 0.0
endif

" File management
if !exists('g:read_text_temp_dir')
  let g:read_text_temp_dir = './.tmp'
endif

if !exists('g:read_text_file_prefix')
  let g:read_text_file_prefix = 'vim_tts_'
endif

if !exists('g:read_text_auto_cleanup')
  let g:read_text_auto_cleanup = 1
endif

" Audio playback
if !exists('g:read_text_audio_backend')
  let g:read_text_audio_backend = 'aplay'
endif

" Audio command settings
" Command name (e.g., 'aplay', 'mpv', 'play', 'paplay')
if !exists('g:read_text_audio_command')
  let g:read_text_audio_command = 'aplay'
endif

" Command arguments (file path is automatically appended at the end)
" Examples:
"   aplay:  ['-q']
"   mpv:    ['--no-video', '--really-quiet']
"   play:   ['-q']
"   paplay: []
if !exists('g:read_text_audio_args')
  let g:read_text_audio_args = ['-q']
endif

" Text processing
if !exists('g:read_text_split_threshold')
  let g:read_text_split_threshold = 50
endif

" Pipeline settings
if !exists('g:read_text_pipeline_buffer_size')
  " Number of audio chunks to buffer ahead (default: 2)
  let g:read_text_pipeline_buffer_size = 2
endif

" コマンド定義
command! -nargs=? ReadFromCursor call denops#request('read-text', 'readFromCursor', [<q-args>])
command! -nargs=? -range ReadSelection call denops#request('read-text', 'readSelection', [<q-args>])
command! -nargs=? ReadLine call denops#request('read-text', 'readLine', [<q-args>])
command! ReadTextStop call denops#request('read-text', 'stopReading', [])
command! ReadTextPause call denops#request('read-text', 'pauseReading', [])
command! ReadTextResume call denops#request('read-text', 'resumeReading', [])
command! ReadTextTogglePause call denops#request('read-text', 'togglePauseReading', [])
command! ReadTextCheckConnection call <SID>check_connection()

" 非同期版コマンド
command! -nargs=? ReadFromCursorAsync call denops#request_async('read-text', 'readFromCursor', [<q-args>], { v -> s:on_complete(v) }, { e -> s:on_error(e) })
command! -nargs=? -range ReadSelectionAsync call denops#request_async('read-text', 'readSelection', [<q-args>], { v -> s:on_complete(v) }, { e -> s:on_error(e) })
command! -nargs=? ReadLineAsync call denops#request_async('read-text', 'readLine', [<q-args>], { v -> s:on_complete(v) }, { e -> s:on_error(e) })

" VOICEVOX接続確認
function! s:check_connection() abort
  let l:result = denops#request('read-text', 'checkVoicevoxConnection', [])
  if l:result
    echo 'VOICEVOX connection: OK'
  else
    echohl WarningMsg
    echo 'VOICEVOX connection: Failed. Please check if VOICEVOX server is running.'
    echohl None
  endif
endfunction

" 非同期完了コールバック
function! s:on_complete(result) abort
  echo 'Read text completed'
endfunction

" 非同期エラーコールバック
function! s:on_error(error) abort
  echohl ErrorMsg
  echo 'Read text failed: ' . string(a:error)
  echohl None
endfunction

" <Plug>マッピング定義
nnoremap <silent> <Plug>(read-text-from-cursor) :ReadFromCursor<CR>
vnoremap <silent> <Plug>(read-text-selection) :ReadSelection<CR>
nnoremap <silent> <Plug>(read-text-line) :ReadLine<CR>
nnoremap <silent> <Plug>(read-text-stop) :ReadTextStop<CR>
nnoremap <silent> <Plug>(read-text-pause) :ReadTextPause<CR>
nnoremap <silent> <Plug>(read-text-resume) :ReadTextResume<CR>
nnoremap <silent> <Plug>(read-text-toggle-pause) :ReadTextTogglePause<CR>
nnoremap <silent> <Plug>(read-text-check-connection) :ReadTextCheckConnection<CR>

" 非同期版<Plug>マッピング
nnoremap <silent> <Plug>(read-text-from-cursor-async) :ReadFromCursorAsync<CR>
vnoremap <silent> <Plug>(read-text-selection-async) :ReadSelectionAsync<CR>
nnoremap <silent> <Plug>(read-text-line-async) :ReadLineAsync<CR>

" 推奨キーマッピング（ユーザーが有効にする場合）
if get(g:, 'read_text_enable_default_mappings', 0)
  nmap <leader>rc <Plug>(read-text-from-cursor)
  vmap <leader>rc <Plug>(read-text-selection)
  nmap <leader>rl <Plug>(read-text-line)
  nmap <leader>rs <Plug>(read-text-stop)
  nmap <leader>rp <Plug>(read-text-toggle-pause)
endif