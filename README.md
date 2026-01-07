# Shirube (標)

Shirube (標) は Neovim/Vim のバッファ上でファイルシステムをテキストとして直接編集できるファイラプラグインです。  
高速性（Deno へのオフロード）、堅牢性（不可視 ID による追跡）、拡張性（Adapter パターン）を重視しています。

## 必要要件
- Neovim（優先）または Vim 8.2+
- Deno
- denops.vim
- nvim-web-devicons（任意）

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

## 使い方（基本）
- バッファを直接編集して変更を表現します。
  - `tmp` と入力 → `tmp` ファイルを作成
  - `tmp/` と入力 → `tmp` ディレクトリを作成
  - 行の編集 → Rename/Move
  - 行の削除 → Delete
- 変更を反映するには Shirube バッファで `:write` を実行します。
- `skip_confirm=false` の場合は確認 UI が表示され、`y` で実行、`n` でキャンセルします。

## キーマップ（任意、デフォルト無効）
Shirube バッファ内のキーマップはデフォルトで無効です。  
有効化するには `g:shirube` に設定を追加してからバッファを開いてください。

- `keymap_enter`: `<CR>` でカーソル行を開く
  - ディレクトリ: そのディレクトリの一覧を表示
  - ファイル: 通常のバッファで開く
- `keymap_parent`: `-` で親ディレクトリへ移動

例:
```vim
let g:shirube = {
      \ "keymap_enter": v:true,
      \ "keymap_parent": v:true,
      \ }
```

## 設定
`g:shirube` の辞書で設定します（値が不正な場合はデフォルトにフォールバック）。

- `skip_confirm`: boolean（default: `false`）
  - true の場合、確認 UI を表示せず Action を実行
- `ui_mode`: `"float" | "buffer"`（default: `"float"`）
  - `float`: フローティング UI（Neovim は Floating Window、Vim は Popup）
  - `buffer`: 確認用の専用バッファ
- `keymap_enter`: boolean（default: `false`）
  - true の場合、`<CR>` でカーソル行を開く
- `keymap_parent`: boolean（default: `false`）
  - true の場合、`-` で親ディレクトリへ移動する

例:
```vim
let g:shirube = {
      \ "skip_confirm": v:false,
      \ "ui_mode": "float",
      \ "keymap_enter": v:true,
      \ "keymap_parent": v:true,
      \ }
```

## エラー/ログ
- denops.vim が読み込まれていない場合は `shirube: denops.vim is required` を表示します。
- エラーは `:messages` と `b:shirube_errors` で確認できます。

## ドキュメント
- 要件定義: `docs/10-requirements/requirements.md`
- 設計: `docs/20-design/README.md`
- ヘッドレス検証: `docs/30-testing/001-headless-checks.md`
