# アーキテクチャ概要

## 目的
- 高速性/堅牢性/拡張性の要件を満たすため、Vim 側の処理を最小化し Deno 側に集中させる。

## レイヤ構成
- Vimscript: コマンド定義、autocmd、syntax/conceal の設定。重い処理は行わない。
- Denops: Vim と Deno の橋渡し。通知/要求の RPC 経路を提供する。
- Deno (TypeScript): ファイル IO、Diff、描画生成、UI 制御の主処理を担う。

## 主要コンポーネントと責務
- Router: `shirube://` を解析し Adapter と BufferState を解決する。
- Adapter: ファイルシステム操作の抽象化（list/rename/move/delete 等）。
- Renderer: `/ID name` 行とハイライト情報（Virtual Text 等）を生成する。
- Mutator: バッファ解析、差分検知、Action 生成、実行順序の整理を行う。
- UI: 確認 UI を表示し、ユーザー入力（y/n）を受け取る。
- State: BufferState と Entry のライフサイクル管理を行う。

## データフロー
### 1) オープン時
1. `:Shirube <dir>` または `shirube://` を検知する。
2. Vimscript が Denops に通知し、Deno 側で Adapter を解決する。
3. Adapter が一覧を返し、Renderer が行/ハイライトを生成する。
4. バッファに描画し、不可視 ID を Conceal する。

### 2) 保存時
1. BufWriteCmd をフックし、Deno 側でバッファ内容を解析する。
2. Mutator が Diff を生成し、Action リストを構築する。
3. `skip_confirm=false` の場合、UI で確認を行う。
4. Adapter が Action を順次実行し、完了後に再描画する。

## 実装方針
- 重い処理（IO/Diff/描画生成）は必ず Deno 側に集約する。
- ID はバッファに埋め込み、Conceal で不可視にして追跡性を担保する。
- Adapter パターンにより、将来のリモート対応を妨げない設計とする。
- UI は `ui_mode` でフローティング/専用バッファを切り替える。
- 実装は関数とオブジェクトで構成し、class は使用しない。
