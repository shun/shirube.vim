# 設定

## 方針
- Deno 側で参照する設定は `config.ts` で一元管理する。
- Vim 側のキーマップ設定は `g:shirube` を直接参照する。
- 値が不正な場合はデフォルトへフォールバックする。

## 設定項目
- `skip_confirm`: boolean（default: `false`）
  - true の場合、確認 UI を表示せず Action を実行する。
- `ui_mode`: `"float" | "buffer"`（default: `"float"`）
  - `float`: フローティング UI を使用する。
  - `buffer`: 専用バッファ UI を使用する。
- `keymap_enter`: boolean（default: `false`）
  - true の場合、`<CR>` でカーソル行を開く。
- `keymap_parent`: boolean（default: `false`）
  - true の場合、`-` で親ディレクトリへ移動する。

## 例
```vim
let g:shirube = {
      \ "skip_confirm": v:false,
      \ "ui_mode": "float",
      \ "keymap_enter": v:true,
      \ "keymap_parent": v:true,
      \ }
```
