if exists('g:loaded_read_text')
  finish
endif
let g:loaded_read_text = 1

" デフォルト設定
if !exists('g:read_text_voicevox_url')
  let g:read_text_voicevox_url = 'http://localhost:50021'
endif

if !exists('g:read_text_speaker_id')
  let g:read_text_speaker_id = 3
endif

if !exists('g:read_text_speed_scale')
  let g:read_text_speed_scale = 1.0
endif

if !exists('g:read_text_pitch_scale')
  let g:read_text_pitch_scale = 0.0
endif

if !exists('g:read_text_temp_dir')
  let g:read_text_temp_dir = './.tmp'
endif

if !exists('g:read_text_file_prefix')
  let g:read_text_file_prefix = 'vim_tts_'
endif

if !exists('g:read_text_auto_cleanup')
  let g:read_text_auto_cleanup = 1
endif

if !exists('g:read_text_audio_backend')
  let g:read_text_audio_backend = 'deno_audio'
endif

if !exists('g:read_text_aplay_command')
  let g:read_text_aplay_command = 'aplay'
endif

if !exists('g:read_text_aplay_options')
  let g:read_text_aplay_options = '-q'
endif

if !exists('g:read_text_split_threshold')
  let g:read_text_split_threshold = 50
endif

" コマンド定義
command! -nargs=? ReadFromCursor call denops#request('read-text', 'readFromCursor', [<q-args>])
command! -nargs=? -range ReadSelection call denops#request('read-text', 'readSelection', [<q-args>])
command! -nargs=? ReadLine call denops#request('read-text', 'readLine', [<q-args>])
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
nnoremap <silent> <Plug>(read-text-check-connection) :ReadTextCheckConnection<CR>

" 非同期版<Plug>マッピング
nnoremap <silent> <Plug>(read-text-from-cursor-async) :ReadFromCursorAsync<CR>
vnoremap <silent> <Plug>(read-text-selection-async) :ReadSelectionAsync<CR>
nnoremap <silent> <Plug>(read-text-line-async) :ReadLineAsync<CR>

" 推奨キーマッピング（ユーザーが有効にする場合）
if get(g:, 'read_text_enable_default_mappings', 0)
  nmap <leader>rs <Plug>(read-text-from-cursor)
  vmap <leader>rs <Plug>(read-text-selection)
  nmap <leader>rl <Plug>(read-text-line)
  nmap <leader>rc <Plug>(read-text-check-connection)
endif