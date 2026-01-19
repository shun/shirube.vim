if exists('g:loaded_shirube')
  finish
endif
let g:loaded_shirube = 1

command! -nargs=? -complete=dir Shirube call shirube#open(<q-args>)
command! ShirubeReload call shirube#reload()

augroup shirube
  autocmd!
  autocmd VimEnter * call shirube#check_startup()
  autocmd BufReadCmd shirube://* call shirube#on_buf_read()
  autocmd BufEnter shirube://* call shirube#_init_window()
  autocmd BufWinEnter shirube://* call shirube#_init_window()
  autocmd WinEnter shirube://* call shirube#_init_window()
  autocmd BufLeave shirube://* call shirube#_clear_conceal_match()
  autocmd BufWriteCmd shirube://* call shirube#on_buf_write()
augroup END
