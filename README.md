# 服薬と受診サマリー

iPhone Safariでホーム画面に追加して使うことを想定した、服薬管理・受診サマリー用のPWAです。4週間ごとの通院に向けて、服薬状況、体調、やる気・動ける度、診察メモを端末内に保存し、診察時に見せる要約を作成します。

このアプリは医療診断を行いません。診察時の説明補助を目的とした記録ツールです。

## 実行方法

```bash
npm install
npm run dev
```

ビルド確認:

```bash
npm run lint
npm run build
```

ビルドしたPWAをローカルで確認する場合:

```bash
npm run preview
```

## GitHub Pagesで公開する

このプロジェクトはGitHub Pages向けのActionsワークフローを含んでいます。

1. このディレクトリをGitHubリポジトリのルートとしてpushします。
2. GitHubのリポジトリ設定で `Settings` → `Pages` → `Build and deployment` を開きます。
3. Source を `GitHub Actions` にします。
4. `main` ブランチへpushすると `.github/workflows/deploy-pages.yml` が `npm ci`、`npm run lint`、`npm run build` を実行し、`dist` をPagesへ公開します。

Viteの `base` は相対パス `./` にしているため、`https://ユーザー名.github.io/リポジトリ名/` のようなプロジェクトページでもCSS/JavaScript/PWA関連ファイルを読み込みやすい構成です。

## 主要機能

- 今日の服薬チェック: 起床直後･コンサータ、朝食後、昼食後、夕食後、就寝前
- 今日の体調: 1〜5段階
- やる気・動ける度: 0〜10
- 前回受診日から次回診察日の前日までの4週間サマリー
- KPI表示: 服薬達成率、平均やる気・動ける度、低活動日数、平均体調、体調2以下の日数、メモ日数
- Rechartsによるやる気・動ける度と体調の推移グラフ
- 医師に見せる診察用サマリー
- 気になった日の自動抽出
- JSONエクスポート、JSONインポート、全データ削除
- PWA manifest、PNG/SVGアイコン、service worker

## データ保存

初期版は外部バックエンド、ログイン、クラウド同期を使いません。保存はIndexedDBを優先し、失敗した場合はlocalStorageにフォールバックします。

未入力値は `null` として保存します。集計では未入力値を0として扱わず、平均計算から除外します。

## 既知の制限

- クラウド同期はありません。端末やブラウザを変える場合はJSONエクスポート/インポートが必要です。
- iPhone Safariのホーム画面追加は、HTTPSで配信されるURLで使うのが実運用向けです。
- `file://` 直開きではService Workerや一部JavaScriptの挙動が制限される場合があります。
- 医療判断、服薬指示、治療方針の提案は行いません。
- 初期版では薬名の編集UIはありません。ただし、データ構造は `timeSlot` 単位で将来拡張しやすくしています。
