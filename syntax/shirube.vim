if exists('b:current_syntax')
  finish
endif

syntax match ShirubeId /^\/\d\+\s/ conceal
syntax match ShirubeDirName /^\%(\/\d\+\s\+\)\?\zs.\+\/$/
syntax match ShirubeFileName /^\%(\/\d\+\s\+\)\?\zs.\+[^/]$/
highlight default link ShirubeId Conceal
highlight default link ShirubeDirName Directory
highlight default link ShirubeFileName Identifier
highlight default link ShirubeMeta Comment
highlight default link ShirubeIcon Identifier

let b:current_syntax = 'shirube'
