if exists('b:current_syntax')
  finish
endif

syntax match ShirubeId /^\/\d\+\s/ conceal nextgroup=ShirubeDirName,ShirubeFileName skipwhite
syntax match ShirubeDirName /[^\n]\+\/$/ contained
syntax match ShirubeFileName /[^\n]\+[^\/]$/ contained
syntax match ShirubeDirName /^\%(\/\d\+\s\)\@!.\+\/$/
syntax match ShirubeFileName /^\%(\/\d\+\s\)\@!.\+[^\/]$/
highlight default link ShirubeId Conceal
highlight default link ShirubeDirName Directory
highlight default link ShirubeFileName Identifier
highlight default link ShirubeMeta Comment
highlight default link ShirubeIcon Identifier

let b:current_syntax = 'shirube'
