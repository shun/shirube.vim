#!/usr/bin/env bash
set -e

REPO=$(pwd)
TEST_DIR=$(mktemp -d)
LOG=$(mktemp)
DENOPS_VIM="${DENOPS_VIM:-$TEST_DIR/denops.vim}"

if [ ! -d "$DENOPS_VIM" ]; then
  git clone --quiet --depth 1 https://github.com/vim-denops/denops.vim "$DENOPS_VIM"
fi

# Create some dummy files in TEST_DIR to ensure rendering works
touch "$TEST_DIR/dummy_file.txt"
mkdir "$TEST_DIR/dummy_dir"

# Create a temporary Vimscript for testing
TEST_VIM="$TEST_DIR/test.vim"
cat <<EOF > "$TEST_VIM"
let &rtp = "$DENOPS_VIM," . &rtp
let &rtp = "$REPO," . &rtp
let &rtp = &rtp . ",$REPO/after"

runtime! plugin/denops.vim
runtime plugin/shirube.vim

let g:shirube_config={'skip_confirm':v:true,'confirm_ui_mode':'buffer'}
let v:errors=[]

Shirube $TEST_DIR

" Wait for Deno to render the buffer
let s:retries = 0
while s:retries < 50
  if getline(1) =~# '^\/\d\+ '
    break
  endif
  sleep 100m
  let s:retries += 1
endwhile

call assert_match('^shirube://', bufname('%'))
call assert_true(line('$') > 0)
call assert_match('^\/\d\+ ', getline(1))

if len(v:errors) > 0
  echohl ErrorMsg
  echom "E2E Test Failed with errors: " . string(v:errors)
  echohl None
  cquit
endif

qa!
EOF

# Run Neovim headlessly
nvim --headless -u NONE -i NONE -n -S "$TEST_VIM" 2> "$LOG"

if [ $? -eq 0 ]; then
  echo "E2E test passed successfully! 🎉"
else
  echo "E2E test failed. Output:"
  cat "$LOG"
  exit 1
fi

rm -rf "$TEST_DIR" "$LOG"
