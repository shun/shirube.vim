# 設計ドキュメント概要

## 目的
- 要件を実装設計に落とし込み、実装/テスト/運用で参照できる状態にする。

## ドキュメント構成
1. `docs/20-design/01-architecture.md` アーキテクチャ概要（責務分割/データフロー）
2. `docs/20-design/02-data-model.md` データモデル（Entry/BufferState/Action と ID 管理）
3. `docs/20-design/03-ui.md` UI/UX（フローティング/専用バッファ、確認 UI、フォールバック）
4. `docs/20-design/04-routing-adapter.md` ルーティング/アダプタ（URL スキーマ、LocalAdapter）
5. `docs/20-design/05-mutator-diff.md` 変更検知/実行（パーサ、Diff、実行制御）
6. `docs/20-design/06-error-logging.md` エラー/ログ/回復（失敗時の中断と通知）
7. `docs/20-design/07-configuration.md` 設定（`skip_confirm`, `confirm_ui_mode` ほか）

## 全体フロー（概要）
1. `:Shirube` または `shirube://` を検知してバッファを開く。
2. Adapter で一覧取得し、Entry に ID を付与して BufferState に保持する。
3. Renderer が `/ID name` 形式で描画し、ID は Conceal で不可視にする。
4. 編集内容を解析して Diff を生成し、Action リストに変換する。
5. `skip_confirm=false` の場合は確認 UI を表示し、承認後に Action を実行する。
6. 実行後は最新状態で再描画する。

## 確認 UI モード（概要）
- `confirm_ui_mode="float"`: Neovim は Floating Window、Vim は Popup を使用する。
- `confirm_ui_mode="buffer"`: 確認用の専用バッファを表示する。
- Vim で Popup が使えない場合は confirm() にフォールバックする。

## 参照
- 要件定義: `docs/10-requirements/requirements.md`
