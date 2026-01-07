if exists('b:current_syntax')
  finish
endif

syntax match ShirubeId /^\/\d\+\s/ conceal
highlight default link ShirubeId Conceal
highlight default link ShirubeMeta Comment
highlight default link ShirubeIcon Identifier

let b:current_syntax = 'shirube'
