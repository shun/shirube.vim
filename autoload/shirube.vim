function! shirube#open(path) abort
  let l:path = empty(a:path) ? getcwd() : a:path
  let l:path = fnamemodify(l:path, ':p')
  let l:url = 'shirube://' . l:path
  execute 'edit' fnameescape(l:url)
endfunction

function! shirube#on_buf_read() abort
  call shirube#_init_buffer()
  call shirube#_request('on_buf_read', [bufnr('%'), bufname('%')])
endfunction

function! shirube#on_vim_enter() abort
  call shirube#_request('on_vim_enter', [])
endfunction

function! shirube#on_buf_write() abort
  call shirube#_request('on_buf_write', [bufnr('%'), bufname('%')])
endfunction

function! shirube#open_cursor() abort
  call shirube#_request('open_cursor', [bufnr('%'), getline('.')])
endfunction

function! shirube#toggle_size() abort
  call shirube#_request('toggle_size', [bufnr('%')])
endfunction

function! shirube#toggle_permissions() abort
  call shirube#_request('toggle_permissions', [bufnr('%')])
endfunction

function! shirube#open_from_current() abort
  call shirube#_request('open_from_current', [])
endfunction

function! shirube#open_parent() abort
  let l:url = bufname('%')
  if l:url !~# '^shirube://'
    return
  endif
  let l:path = substitute(l:url, '^shirube://', '', '')
  if l:path =~# '^/.\+' || l:path =~# '^[A-Za-z]:/.\+'
    let l:path = substitute(l:path, '/\+$', '', '')
  endif
  let l:parent = fnamemodify(l:path, ':h')
  if empty(l:parent)
    let l:parent = '/'
  endif
  call shirube#open(l:parent)
endfunction

function! shirube#close() abort
  if &filetype !=# 'shirube'
    return
  endif
  execute 'bdelete'
endfunction

function! shirube#_request(method, params) abort
  if !exists('g:loaded_denops')
    echoerr 'shirube: denops.vim is required'
    return
  endif
  call denops#server#connect_or_start()
  if denops#server#wait() < 0
    return
  endif
  if denops#plugin#wait('shirube') != 0
    return
  endif
  call denops#request('shirube', a:method, a:params)
endfunction

function! shirube#_init_buffer() abort
  setlocal buftype=acwrite
  setlocal bufhidden=hide
  setlocal noswapfile
  setlocal modifiable
  setlocal filetype=shirube
  call shirube#_init_window()
  augroup ShirubeConstrainCursor
    autocmd! * <buffer>
    autocmd InsertEnter <buffer> call timer_start(0, {-> shirube#constrain_cursor()})
    autocmd CursorMoved <buffer> call shirube#constrain_cursor()
    autocmd CursorMovedI <buffer> call shirube#constrain_cursor()
  augroup END
endfunction

function! shirube#_init_window() abort
  setlocal nowrap
  setlocal conceallevel=3
  setlocal concealcursor=nvic
  call shirube#_apply_conceal_match()
endfunction

function! shirube#_apply_conceal_match() abort
  call shirube#_clear_conceal_match()
  let w:shirube_id_conceal_match = matchadd('Conceal', '^\/\d\+ ')
endfunction

function! shirube#_clear_conceal_match() abort
  if exists('w:shirube_id_conceal_match')
    silent! call matchdelete(w:shirube_id_conceal_match)
    unlet w:shirube_id_conceal_match
  endif
endfunction

function! shirube#constrain_cursor() abort
  if !exists('g:loaded_denops')
    return
  endif
  if &filetype !=# 'shirube'
    return
  endif
  call denops#request('shirube', 'constrain_cursor', [])
endfunction

function! shirube#paste() abort
  normal! p
  call shirube#_request('auto_rename_paste', [bufnr('%'), line('.')])
endfunction
