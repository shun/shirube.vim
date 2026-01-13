# 要件定義書: Shirube (標) - Denops File Explorer

## 1. 概要

### 1.1 目的
Shirube (標) は Neovim/Vim のバッファ上でファイルシステムをテキストとして直接編集（リネーム、移動、削除、作成）できるファイラプラグインである。

### 1.2 主要コンセプト
- **高速性**: denops.vim を採用し、重い処理（ファイル IO、Diff 計算、描画生成）を Deno (TypeScript) にオフロードする。
- **堅牢性**: バッファ内に不可視の ID を埋め込むことで、ファイル名変更時の追跡を確実に行う。
- **拡張性**: Adapter パターンを採用し、将来的に SSH や S3 などのリモートファイルシステムに対応可能な設計とする。

## 2. 命名と配布

### 2.1 リポジトリ
- GitHub リポジトリ: shun/shirube.vim

### 2.2 Ex コマンド
- :Shirube

### 2.3 URL スキーマ
- shirube://<path>

## 3. 対象環境

### 3.1 対象エディタ
- Neovim (Primary)
- Vim 8.2+ (Secondary)

### 3.2 対象 OS
- Deno が動作する主要 OS (Linux, macOS, Windows を想定)

### 3.3 外部要件
- Deno が利用可能
- denops.vim が利用可能

## 4. スコープ

### 4.1 インスコープ (v1)
- LocalAdapter によるローカルファイルシステム操作
- ディレクトリ一覧の取得とバッファ描画
- バッファ編集による Create/Move/Rename/Delete
- 変更検知 (Diff) と確認 UI
- 反映後の再描画
- Neovim/Vim の UI 差異を吸収した実装

### 4.2 アウトスコープ (v1)
- SSH/S3 などのリモートアダプター
- ファイル内容の編集機能
- 高度な検索/フィルタリング/同期機構

## 5. 基本制約 (必須)

### 5.1 Deno/denops の採用
- ファイル IO、Diff、描画生成など重い処理は Deno (TypeScript) に委譲する。

### 5.2 不可視 ID の埋め込み
- バッファ内行に ID を埋め込み、Conceal で不可視化する。

### 5.3 Adapter パターン
- ファイルシステム操作は Adapter に集約し、将来のリモート対応を妨げない。

### 5.4 Neovim 優先 + Vim フォールバック
- UI はフローティングまたは専用バッファを設定で選択できる。
- フローティング選択時は Neovim では Floating Window、Vim では Popup を使用する。
- Vim では Popup が使えない場合に confirm() などの簡易 UI にフォールバックする。

## 6. アーキテクチャ

### 6.1 Bootstrap (Vimscript)
- :Shirube コマンド定義、augroup 設定、syntax 定義 (Conceal) を担う。

### 6.2 Event Hook (Vimscript)
- BufReadCmd (開く) と BufWriteCmd (保存) をフックし、denops.dispatch() で通知する。

### 6.3 Denops (Bridge)
- Vim と Deno 間の RPC 通信を担当する。

### 6.4 Backend (TypeScript)
- Router: URL スキーマ (shirube://) から Adapter/State を解決する。
- Adapter: ファイルシステム操作の抽象化 (List, Rename, Delete, Move 等)。
- Renderer: 表示用テキスト（ID 埋め込み済み）とハイライト情報を生成する。
- Mutator: バッファ解析、変更検知 (Diff)、アクション生成、実行制御を行う。
- UI: 確認画面（フローティング/専用バッファ）を構築・制御する。

## 7. 機能要件

### 7.1 読み込みと表示 (The View)
1. shirube://* または（設定が有効なら）ディレクトリオープンを検知する。
2. Adapter を通じてファイル一覧を取得する。
3. 各ファイルに一意な ID を付与し、BufferState に保存する。
4. レンダリング:
   - 行フォーマット: `/ID filename` (例: `/1 myfile.txt`)
   - ディレクトリは末尾に `/` を付けて表示する。
   - Conceal: `syntax match ShirubeId /^\/\d*\s/ conceal` を適用する。
   - Metadata: サイズ/パーミッション等は Virtual Text (extmark) で装飾表示する。
   - ディレクトリ/ファイルで文字色を分ける。
   - Metadata は右寄せで整列表示する。
5. ナビゲーション:
   - `keymaps` で指定されたキーに応じて動作する（デフォルト無効）。
     - `open_cursor`: カーソル行を開く（ディレクトリ行は移動、ファイル行は開く）。
     - `open_parent`: 親ディレクトリへ移動する。
     - `close`: Shirube バッファを閉じる。
     - `toggle_size`: サイズ表示の ON/OFF。
     - `toggle_permissions`: パーミッション表示の ON/OFF。
   - `keymaps_global` で指定されたキーに応じて Shirube を開く（デフォルト無効）。
     - `open_shirube`: 現在のバッファ/ディレクトリから Shirube を開く。

### 7.2 編集と変更検知 (The Mutator)
1. バッファ全行を解析する。
   - ID あり: 元のパスと比較し、不一致なら Move/Rename。
   - ID なし: 新規作成行として Create。
   - 欠落 ID: BufferState にのみ存在する ID は Delete。
2. バリデーション:
   - 同名ファイルの存在チェック。
   - パスの正規化（`../` や `./` の解決）。
3. Diff を生成し、Action リストを構築する。

### 7.3 確認と実行 (Confirmation & Execution)
1. `skip_confirm: boolean` (default: false) と `confirm_ui_mode: "float" | "buffer"` (default: "float") を確認する。
2. false の場合、confirm_ui_mode に応じてフローティングまたは専用バッファに Action リストを色付きで表示する
   - フローティングは Neovim では Floating Window、Vim では Popup を使用する。
   - 専用バッファは確認用の一時バッファとして表示する。
   - Create=緑, Delete=赤, Move=黄
   - y/<CR>/n で実行可否を受付
3. `Adapter.performAction(action)` を順次実行する。
4. エラー時は処理を中断し、失敗アクションと理由を通知する。
5. 処理完了後、最新状態でバッファを再描画する。

### 7.4 アダプター (Adapter Interface)
- 初期実装は LocalAdapter のみ。
- インターフェース:

```ts
interface Adapter {
  scheme: string;
  listDir(url: string): Promise<Entry[]>;
  isModifiable(url: string): Promise<boolean>;
  performAction(action: Action): Promise<void>;
  // normalizeUrl, getParent などのヘルパーメソッド
}
```

### 7.5 互換性と UI
- Neovim: Floating Window/専用バッファを選択可能。
- Vim: Popup/専用バッファを選択可能。denops-std で API 差異を吸収し、必要なら confirm() などで簡易 UI を提供。

### 7.6 設定
- `confirm_ui_mode`: "float" | "buffer"。確認 UI の表示方式。default: "float"。
- `skip_confirm`: boolean。確認 UI の表示を省略する。default: false。
- `keymaps`: `{ "<key>": "open_cursor" | "open_parent" | "close" | "toggle_size" | "toggle_permissions" }`。default: `{}`。
- `keymaps_global`: `{ "<key>": "open_shirube" }`。default: `{}`。
- `sort`: `{ "group": "none" | "directories-first" | "files-first" }`。default: `{ "group": "none" }`。
- `meta`: `{ "size": boolean, "permissions": boolean }`。default: `{ "size": false, "permissions": false }`。
- `open_on_startup`: boolean。起動時にディレクトリ引数が1つ指定された場合に Shirube を開く。default: false。
- `log_file`: string。デバッグログの出力先（ファイル/ディレクトリ）。default: ""。

## 8. データ仕様

### 8.1 エントリと状態管理

```ts
type BufNr = number;
type EntryId = number;

interface Entry {
  id: EntryId;        // 一意な ID (リネーム追跡用)
  name: string;       // ファイル名
  isDirectory: boolean;
  path: string;       // 元のフルパス (変更検知の基準)
  meta: {             // 表示・ソート用メタデータ
    size?: number;
    mtime?: Date;
    permissions?: string;
  };
}

interface BufferState {
  bufnr: BufNr;
  url: string;        // shirube://<path>
  adapter: Adapter;   // 使用中のアダプターインスタンス
  entries: Map<EntryId, Entry>;
  nextId: number;     // 次に割り振る ID カウンター
}
```

### 8.2 変更アクション

```ts
type ActionType = "create" | "delete" | "move" | "copy";

interface Action {
  type: ActionType;
  entryType: "file" | "directory";
  src?: string;   // delete, move, copy 用
  dest?: string;  // create, move, copy 用
}
```

## 9. 非機能要件

### 9.1 パフォーマンス
- 可能な限り Vimscript の負荷を減らし、Deno 側で処理する。
- 大規模ディレクトリでも応答性を維持する。

### 9.2 堅牢性
- 不可視 ID によりリネーム/移動を追跡できる。
- 実行中にエラーが発生した場合は処理を中断して通知する。

### 9.3 拡張性
- Adapter 追加でリモートファイルシステムに対応できる設計とする。

## 10. 受け入れ基準

1. shirube:// またはディレクトリオープンで一覧を表示できる。
2. 各行に ID が埋め込まれ、Conceal によりユーザーには不可視となる。
3. バッファ編集で Rename/Move/Create/Delete を検知できる。
4. `:w` 実行時に Action リストが生成される。
5. `skip_confirm=false` の場合、確認 UI が表示され y/<CR>/n で実行可否を選べる。
6. Action を順次実行し、失敗時は原因を通知して中断する。
7. 処理完了後、最新状態でバッファを再描画する。
8. UI モードとしてフローティング/専用バッファを設定で切り替えられ、Vim では必要に応じて簡易 UI にフォールバックする。
9. LocalAdapter でローカルファイルの操作が可能である。
10. Adapter インターフェースに従った拡張が可能である。

## 11. 付録: ディレクトリ構成

```
shirube/
|-- autoload/
|   `-- shirube.vim           # Vimscript エントリーポイント
|-- denops/
|   `-- shirube/
|       |-- main.ts           # Denops エントリーポイント
|       |-- app.ts            # アプリケーションロジック統括
|       |-- types.ts          # 型定義
|       |-- constants.ts      # 定数
|       |-- util.ts           # ユーティリティ
|       |-- config.ts         # 設定管理
|       |-- state.ts          # バッファ状態管理 (BufferState)
|       |-- adapter/
|       |   |-- interface.ts  # Adapter Interface
|       |   `-- local.ts      # Local Filesystem Adapter
|       |-- view/
|       |   |-- renderer.ts   # 行生成、ハイライト生成
|       |   `-- window.ts     # Window 操作抽象化
|       `-- action/
|           |-- parser.ts     # バッファ解析
|           |-- diff.ts       # Diff 計算
|           `-- executor.ts   # アクション実行
|-- plugin/
|   `-- shirube.vim           # プラグイン読み込み定義
`-- syntax/
    `-- shirube.vim           # シンタックス定義 (Conceal 含む)
```
