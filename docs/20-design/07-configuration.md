# 設定

## 方針
- 設定は Deno 側の `config.ts` で一元管理する。
- Vim 側は最小限の橋渡しに留め、設定の参照は行わない。
- 値が不正な場合はデフォルトへフォールバックする。

## 設定項目
- `skip_confirm`: boolean（default: `false`）
  - true の場合、確認 UI を表示せず Action を実行する。
- `ui_mode`: `"float" | "buffer"`（default: `"float"`）
  - `float`: フローティング UI を使用する。
  - `buffer`: 専用バッファ UI を使用する。
- `keymaps`: `{ "<key>": "open_cursor" | "open_parent" }`（default: `{}`）
  - `open_cursor`: カーソル行を開く。
  - `open_parent`: 親ディレクトリへ移動する。
- `keymaps_global`: `{ "<key>": "open_shirube" }`（default: `{}`）
  - `open_shirube`: 現在のバッファ/ディレクトリから Shirube を開く。
- `open_on_startup`: boolean（default: `false`）
  - 起動時にディレクトリ引数が1つ指定された場合、Shirube を開く。
- `log_file`: string（default: `""`）
  - デバッグログの出力先（ファイル/ディレクトリ）。
  - ディレクトリ指定時は `shirube.log` に出力する。

## 例
```vim
let g:shirube = {
      \ "skip_confirm": v:false,
      \ "ui_mode": "float",
      \ "keymaps": {
      \   "<CR>": "open_cursor",
      \   "-": "open_parent",
      \ },
      \ "keymaps_global": {
      \   "-": "open_shirube",
      \ },
      \ "open_on_startup": v:true,
      \ "log_file": "./tmp/nvim",
      \ }
```
