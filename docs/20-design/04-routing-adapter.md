# ルーティング / アダプタ

## URL スキーマ
- エントリポイントは `shirube://<path>` を使用する。
- Router は URL を解析し、対応する Adapter を解決する。
- パスは Adapter 側で正規化する（`./`, `../` の解決など）。

## Router の責務
- `scheme` をキーに Adapter を選択する。
- URL からバッファ状態（BufferState）を初期化する。
- `isModifiable(url)` により編集可否を判定する。

## Adapter インターフェース
```ts
interface Adapter {
  scheme: string;
  listDir(url: string): Promise<Entry[]>;
  isModifiable(url: string): Promise<boolean>;
  performAction(action: Action): Promise<void>;
  // normalizeUrl, getParent などのヘルパーメソッド
}
```

## LocalAdapter の役割
- ローカルファイルシステムを対象とする。
- `listDir` で Entry 一覧を構築する。
- `performAction` で create/move/delete を実行する。

## 拡張方針
- Adapter を追加するだけでリモート FS に対応できる。
- Adapter は Deno 側に集約し、Vim 側にはロジックを持たせない。
