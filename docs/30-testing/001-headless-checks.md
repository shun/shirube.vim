# ヘッドレス検証項目

## 目的
- 人手の操作を行わず、`nvim --headless` で動作確認できる状態にする。
- 失敗時は非 0 で終了し、ログを保存する。

## 前提
- Neovim、denops.vim、Deno が利用可能である。
- テスト用ディレクトリを用意する（新規作成/削除/リネームが可能）。

## 実行コマンド（雛形）
```sh
REPO=/path/to/shirube.vim
DENOPS_VIM=/path/to/denops.vim
TEST_DIR=/tmp/shirube-test
LOG=/tmp/shirube-headless.log

nvim --headless -u NONE -i NONE -n \
  +"set rtp^=$DENOPS_VIM" \
  +"set rtp^=$REPO" \
  +"set rtp+=$REPO/after" \
  +"runtime plugin/shirube.vim" \
  +"let g:shirube={'skip_confirm':v:true,'confirm_ui_mode':'buffer','keymaps':{'<CR>':'open_cursor'},'keymaps_global':{'-':'open_shirube'},'log_file':'./tmp/nvim'}" \
  +"let v:errors=[]" \
  +"redir => g:shirube_log" \
  +"Shirube $TEST_DIR" \
  +"call assert_match('^shirube://', bufname('%'))" \
  +"call assert_true(line('$') > 0)" \
  +"redir END" \
  +"call writefile(split(g:shirube_log, \"\\n\"), \"$LOG\")" \
  +"if len(v:errors) | cquit | endif" \
  +"qa!"
```

## 検証項目（自動）
- shirube バッファが開く（`bufname('%')` が `shirube://` で始まる）。
- 行数が 0 より大きい（一覧が描画されている）。
- 先頭行が `/ID name` 形式になっている（ID と空白が含まれる）。
- `keymaps` に `"<CR>": "open_cursor"` を設定したとき、`<CR>` でディレクトリ行を開くと `shirube://` のバッファに遷移する。
- `keymaps_global` に `"-": "open_shirube"` を設定したとき、通常バッファで `-` を押すと Shirube を開く。

## 追加検証（実装に合わせて拡充）
- 変更検知（Create/Move/Rename/Delete）が Action に変換される。
- `skip_confirm=false` で確認 UI が起動する（`feedkeys('y','n')` で承認を与える）。
- `confirm_ui_mode=float`/`confirm_ui_mode=buffer` の切替が反映される。
- Action 実行後に再描画される。
