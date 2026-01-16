# Shirube (標)

Shirube (標) は Neovim/Vim のバッファ上でファイルシステムをテキストとして直接編集できるファイラプラグインです。  
高速性（Deno へのオフロード）、堅牢性（不可視 ID による追跡）、拡張性（Adapter パターン）を重視しています。

## 必要要件
- Neovim（優先）または Vim 8.2+
- Deno
- denops.vim

## インストール
お使いのプラグインマネージャで `denops.vim` と `shun/shirube.vim` を追加してください。

例（vim-plug）:
```vim
call plug#begin()
Plug 'vim-denops/denops.vim'
Plug 'shun/shirube.vim'
call plug#end()
```

## 起動
- `:Shirube` でカレントディレクトリを開く
- `:Shirube {dir}` で任意のディレクトリを開く
- `:edit shirube://<path>` でも開けます
- `nvim {dir}` でディレクトリを引数にして起動すると自動で Shirube を開く

## 使い方（基本）
- バッファを直接編集して変更を表現します。
  - `tmp` と入力 → `tmp` ファイルを作成
  - `tmp/` と入力 → `tmp` ディレクトリを作成
  - 行の編集 → Rename/Move
  - 行の削除 → Delete
- 変更を反映するには Shirube バッファで `:write` を実行します。
- `skip_confirm=false` の場合は確認 UI が表示され、`y` または `<CR>` で実行、`n` でキャンセルします。

## キーマップ（任意、デフォルト無効）
Shirube バッファ内のキーマップはデフォルトで無効です。  
有効化するには `g:shirube` に設定を追加してからバッファを開いてください。

- `keymaps`: キーとアクションの対応表
  - `open_cursor`: カーソル行を開く（ディレクトリなら移動、ファイルなら開く）
  - `open_parent`: 親ディレクトリへ移動
  - `close`: Shirube バッファを閉じる
  - `toggle_size`: サイズ表示の ON/OFF
  - `toggle_permissions`: パーミッション表示の ON/OFF
- `keymaps_global`: グローバルキーマップ（通常バッファで Shirube を開く）
  - `open_shirube`: 現在のバッファ/ディレクトリから Shirube を開く

 例:
```vim
let g:shirube = {
      \ "keymaps": {
      \   "<CR>": "open_cursor",
      \   "-": "open_parent",
      \   "<Esc>": "close",
      \ },
      \ "keymaps_global": {
      \   "-": "open_shirube",
      \ },
      \ }
```

## 設定
`g:shirube` の辞書で設定します（値が不正な場合はデフォルトにフォールバック）。
設定の解釈と適用は Deno (TypeScript) 側で行います。

- `skip_confirm`: boolean（default: `false`）
  - true の場合、確認 UI を表示せず Action を実行
- `confirm_ui_mode`: `"float" | "buffer"`（default: `"float"`）
  - `float`: 確認 UI をフローティング表示（Neovim は Floating Window、Vim は Popup）
  - `buffer`: 確認 UI を専用バッファで表示
- `keymaps`: `{ "<key>": "open_cursor" | "open_parent" | "close" | "toggle_size" | "toggle_permissions" }`（default: `{}`）
  - キーは Vim の表記で指定する（例: `<CR>`, `-`, `h`）
- `keymaps_global`: `{ "<key>": "open_shirube" }`（default: `{}`）
  - グローバルに Shirube を開くキーを指定する
- `sort`: `{ "group": "none" | "directories-first" | "files-first" }`（default: `{ "group": "none" }`）
  - `group`: ディレクトリ/ファイルの並び順を指定する（グループ内は名前順）
- `meta`: `{ "size": boolean, "permissions": boolean }`（default: `{ "size": false, "permissions": false }`）
  - メタ情報（サイズ/パーミッション）の表示を切り替える
- `log_file`: string（default: `""`）
  - デバッグログの出力先（ファイル/ディレクトリ）
  - ディレクトリ指定時は `shirube.log` に出力する

 例:
```vim
let g:shirube = {
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

## エラー/ログ
- denops.vim が読み込まれていない場合は `shirube: denops.vim is required` を表示します。
- エラーは `:messages` と `b:shirube_errors` で確認できます。
- デバッグログは `log_file` に JSON Lines 形式で追記されます。

## ドキュメント
- 要件定義: `docs/10-requirements/requirements.md`
- 設計: `docs/20-design/README.md`
- ヘッドレス検証: `docs/30-testing/001-headless-checks.md`
