# 変更検知 / Diff / 実行制御

## 解析対象
- バッファ内の全行を解析する。
- 空行は無視する。
- 行フォーマットは `/ID name` を基本とし、ID なしの行は新規作成とみなす。

## パーサ仕様
- `/ID name` に一致する行:
  - `ID` が `BufferState.entries` に存在することを確認する。
  - `name` を `url` の相対パスとして解決する。
- `ID` が存在しない行:
  - 新規作成とみなす。
  - 末尾が `/` の場合は directory、それ以外は file と判定する。
  - 例: `tmp` は file 作成、`tmp/` は directory 作成とする。

## Diff 生成
- 既存 Entry と解析結果を比較し、Action を構築する。
  - `ID` があり、解決後のパスが異なる場合: `move`
  - `ID` なしの行: `create`
  - `BufferState` に存在するが行に現れない `ID`: `delete`

## バリデーション
- 目的パスの重複（同名）を検知する。
- `../` や `./` を正規化し、比較は正規化後に行う。
- `ID` 未知/空名など、解析不能な行はエラーとする。

## Action の実行順序
- 衝突を避けるため、以下の順で並べる。
  1. create (directory)
  2. move
  3. create (file)
  4. delete (file)
  5. delete (directory)

## 実行制御
- `skip_confirm=false` の場合は確認 UI を表示する。
- 承認後に `Adapter.performAction` を順次実行する。
- エラー発生時は直ちに中断し、理由を通知する。
