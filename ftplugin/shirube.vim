if exists('b:did_ftplugin')
  finish
endif
let b:did_ftplugin = 1

let s:config = get(g:, 'shirube', {})
if get(s:config, 'keymap_enter', v:false)
  nnoremap <silent><buffer> <CR> :call shirube#open_cursor()<cr>
endif
if get(s:config, 'keymap_parent', v:false)
  nnoremap <silent><buffer> - :call shirube#open_parent()<cr>
endif
