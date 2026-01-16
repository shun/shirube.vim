if exists('b:current_syntax')
  finish
endif

syntax match ShirubeId /^\/\d\+ / conceal
syntax match ShirubeDirName /^\/\d\+ .\+\/$/
syntax match ShirubeFileName /^\/\d\+ .\+[^\/]$/
highlight default link ShirubeId Conceal
highlight default link ShirubeDirName Directory
highlight default link ShirubeFileName Identifier
highlight default link ShirubeMeta Comment
highlight default link ShirubeIcon Identifier

let b:current_syntax = 'shirube'
