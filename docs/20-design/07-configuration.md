# 設定・コマンド

## コマンド
- `:Shirube [path]`
  - Shirube を開く。`path` 省略時はカレントディレクトリ。
  - **シングルトン動作**: 既に Shirube ウィンドウが開いている場合は、そのウィンドウへジャンプして内容を更新する。
- `:Shirube! [path]` (Bang 付き)
  - 既存ウィンドウの再利用を行わず、現在のウィンドウで新しく Shirube バッファを開く。
- `:ShirubeReload`
  - 現在の Shirube バッファを再読込する。

## 方針
- 設定は Deno 側の `config.ts` で一元管理する。
- Vim 側は最小限の橋渡しに留め、設定の参照は行わない。
- 値が不正な場合はデフォルトへフォールバックする。

## 設定項目
- `skip_confirm`: boolean（default: `false`）
  - true の場合、確認 UI を表示せず Action を実行する。
- `confirm_ui_mode`: `"float" | "buffer"`（default: `"float"`）
  - `float`: 確認 UI をフローティング表示する。
  - `buffer`: 確認 UI を専用バッファで表示する。
- `keymaps`: `{ "<key>": "open_cursor" | "open_parent" | "close" | "toggle_size" | "toggle_permissions" }`（default: `{}`）
  - `open_cursor`: カーソル行を開く。
  - `open_parent`: 親ディレクトリへ移動する。
  - `close`: Shirube バッファを閉じる。
  - `toggle_size`: サイズ表示の ON/OFF。
  - `toggle_permissions`: パーミッション表示の ON/OFF。
- `keymaps_global`: `{ "<key>": "open_shirube" }`（default: `{}`）
  - `open_shirube`: 現在のバッファ/ディレクトリから Shirube を開く。
- `sort`: `{ "group": "none" | "directories-first" | "files-first" }`（default: `{ "group": "none" }`）
  - `group`: ディレクトリ/ファイルの並び順を指定する（グループ内は名前順）。
- `meta`: `{ "size": boolean, "permissions": boolean }`（default: `{ "size": false, "permissions": false }`）
  - メタ情報（サイズ/パーミッション）の表示を切り替える。
- `log_file`: string（default: `""`）
  - デバッグログの出力先（ファイル/ディレクトリ）。
  - ディレクトリ指定時は `shirube.log` に出力する。

## 例
```vim
let g:shirube_config = {
      \ "skip_confirm": v:false,
      \ "confirm_ui_mode": "float",
      \ "keymaps": {
      \   "<CR>": "open_cursor",
      \   "-": "open_parent",
      \   "<Esc>": "close",
      \ },
      \ "keymaps_global": {
      \   "-": "open_shirube",
      \ },
      \ "sort": {
      \   "group": "directories-first",
      \ },
      \ "meta": {
      \   "size": v:true,
      \   "permissions": v:true,
      \ },
      \ "log_file": "./tmp/nvim",
      \ }
```
