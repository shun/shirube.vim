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

function! shirube#on_buf_write() abort
  call shirube#_request('on_buf_write', [bufnr('%'), bufname('%')])
endfunction

function! shirube#open_cursor() abort
  call shirube#_request('open_cursor', [bufnr('%'), getline('.')])
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
  setlocal nowrap
  setlocal filetype=shirube
  setlocal conceallevel=2
  setlocal concealcursor=nvic
endfunction
