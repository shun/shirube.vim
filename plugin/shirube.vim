if exists('g:loaded_shirube')
  finish
endif
let g:loaded_shirube = 1

command! -nargs=? -complete=dir Shirube call shirube#open(<q-args>)

augroup shirube
  autocmd!
  autocmd VimEnter * call shirube#on_vim_enter()
  autocmd BufReadCmd shirube://* call shirube#on_buf_read()
  autocmd BufWriteCmd shirube://* call shirube#on_buf_write()
augroup END
