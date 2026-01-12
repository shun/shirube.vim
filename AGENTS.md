# AGENTS

## 対応言語
- 対応はすべて日本語で行う。

## プロジェクト概要
- Shirube (標) は Neovim/Vim のバッファ上でファイルシステムをテキストとして直接編集できるファイラプラグインである。
- 主要コンセプトは高速性（Deno へのオフロード）、堅牢性（不可視 ID による追跡）、拡張性（Adapter パターン）である。

## 絶対要件
- ファイル IO、Diff、描画生成などの重い処理は denops.vim + Deno (TypeScript) に委譲する。
- 設定は Deno (TypeScript) 側で一元管理し、Vimscript は最小限に留める。
- バッファ内に不可視 ID を埋め込み、Conceal によってユーザーには見えない状態で追跡できるようにする。
- Adapter パターンでファイル操作を抽象化し、将来的なリモート対応を妨げない。
- Neovim を優先し、Vim ではフォールバック UI を用意する。
- ドキュメントは原則として日本語で記述する。
- 要件定義書は `docs/10-requirements/requirements.md` に配置する。
- idaten.vim と同様に class は禁止し、関数とオブジェクトで表現する。

## 命名と配布
- Repo: shun/shirube.vim
- Ex コマンド: :Shirube
- URL スキーマ: shirube://<path>
