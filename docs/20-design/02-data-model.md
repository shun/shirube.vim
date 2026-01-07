# データモデル

## Entry / BufferState
```ts
type BufNr = number;
type EntryId = number;

interface Entry {
  id: EntryId;
  name: string;
  isDirectory: boolean;
  path: string;
  meta: {
    size?: number;
    mtime?: Date;
    permissions?: string;
  };
}

interface BufferState {
  bufnr: BufNr;
  url: string;        // shirube://<path>
  adapter: Adapter;
  entries: Map<EntryId, Entry>;
  nextId: number;
}
```

## Action
```ts
type ActionType = "create" | "delete" | "move" | "copy";

interface Action {
  type: ActionType;
  entryType: "file" | "directory";
  src?: string;
  dest?: string;
}
```

## ID 埋め込み形式
- 行フォーマットは `/ID name` とする。
- `ID` は `EntryId`（数値）で、バッファ内に埋め込む。
- ID 部分は Conceal で不可視化する。
- 行の `name` は相対パスを許容し、Move/Rename を表現できる。

## メタデータ表示
- `meta` はバッファ本文に埋め込まず、Virtual Text (extmark) で表示する。
- 表示は Adapter/Renderer 側で制御し、Diff 対象から除外する。

## ID 管理
- `nextId` を単調増加させ、一意な ID を割り当てる。
- `entries` から ID と path を辿れるようにし、Rename/Move の追跡に使う。
