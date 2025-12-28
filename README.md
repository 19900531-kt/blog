# ミニブログ管理アプリ（フロントエンド）

Reactを使用したミニブログ管理アプリのフロントエンドアプリケーションです。

## 起動方法（front）

### 前提条件
- Node.js (v20以上推奨)
- npm または yarn
- バックエンドサーバー（Rust）が起動していること（`http://127.0.0.1:8000`）、または外部GraphQLサーバー

### 外部サーバーの使用

外部のGraphQLサーバーを使用する場合は、環境変数を設定してください：

1. `.env.local`ファイルを作成（`.env.example`を参考に）
2. `NEXT_PUBLIC_GRAPHQL_ENDPOINT`に外部サーバーのURLを設定

例：
```
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://your-graphql-server.com/graphql
```

環境変数を設定した後、開発サーバーを再起動してください。

### インストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### GraphQLコードの生成

スキーマ変更後は、以下でコードを再生成してください：

```bash
npm run codegen
```

### ビルド

```bash
npm run build
```

### プロダクション起動

```bash
npm start
```

## 使用技術

### フレームワーク・ライブラリ
- **Next.js 16.1.1** - Reactフレームワーク（App Router使用）
- **React 19.2.3** - UIライブラリ
- **TypeScript 5** - 型安全性

### データフェッチ・状態管理
- **@tanstack/react-query 5.90.12** - サーバー状態管理、データフェッチ
- **graphql-request 7.4.0** - GraphQLクライアント

### GraphQL
- **@graphql-codegen/cli** - GraphQLコード生成
- **@graphql-codegen/typescript** - TypeScript型定義生成
- **@graphql-codegen/typescript-operations** - 操作（クエリ・ミューテーション）の型定義生成
- **@graphql-codegen/typescript-react-query** - TanStack Queryフック生成

### フォーム・バリデーション
- **react-hook-form 7.69.0** - フォーム管理
- **zod 4.2.1** - スキーマバリデーション
- **@hookform/resolvers 5.2.2** - zodとreact-hook-formの統合

### スタイリング
- **Tailwind CSS 4** - ユーティリティファーストCSSフレームワーク

### 開発ツール
- **@tanstack/react-query-devtools** - React Query開発ツール

## 完成度（実装済み・未実装）

### 実装済み機能

#### 記事一覧ページ
- ✅ `posts`クエリで投稿一覧を取得
- ✅ タイトル・著者名（author.name）・投稿日時を表示
- ✅ 投稿日時で降順ソート（新しい順）
- ✅ 詳細ページへの遷移（Linkコンポーネント使用）
- ✅ ローディング表示（スピナーアニメーション）
- ✅ エラー表示（エラーメッセージと再読み込みボタン）

#### 記事詳細ページ
- ✅ `post(id)`クエリで投稿を取得
- ✅ タイトル・著者名・アバター・投稿日・本文・タグを表示
- ✅ Not Found対応（投稿が見つからない場合の表示）
- ✅ ローディング表示（スピナーアニメーション）
- ✅ エラー表示（エラーメッセージと再読み込みボタン）
- ✅ 一覧ページへの戻るボタン

#### 新規記事作成
- ✅ タイトル・本文の入力フィールド
- ✅ タグの入力（カンマ区切り → 配列変換）
- ✅ 著者選択（固定値のセレクトボックス）
- ✅ zod + react-hook-formによるバリデーション
- ✅ 投稿成功後の成功メッセージ表示
- ✅ 投稿成功後の詳細ページへの自動遷移（2秒後）

#### GraphQL統合
- ✅ graphql-codegenによるコード生成
- ✅ @tanstack/react-queryでのデータフェッチ
- ✅ GraphQLサブクエリ（author { name }）の実装

#### UI/UX
- ✅ レスポンシブデザイン（Tailwind CSS）
- ✅ ローディング状態の視覚的フィードバック
- ✅ エラー状態の明確な表示
- ✅ 成功メッセージの表示

### 未実装機能

- ❌ 記事の編集機能
- ❌ 記事の削除機能
- ❌ ページネーション
- ❌ 検索機能
- ❌ フィルター機能
- ❌ 認証・認可機能
- ❌ ユーザー管理機能

## プロジェクト構造

```
my-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 一覧ページ
│   │   ├── posts/[id]/        # 詳細ページ
│   │   └── layout.tsx         # ルートレイアウト
│   ├── components/             # Reactコンポーネント
│   │   ├── PostList.tsx       # 投稿一覧コンポーネント
│   │   ├── PostDetail.tsx     # 投稿詳細コンポーネント
│   │   ├── PostForm.tsx       # 投稿フォームコンポーネント
│   │   └── providers/
│   │       └── QueryProvider.tsx  # TanStack Queryプロバイダー
│   ├── generated/              # 自動生成ファイル
│   │   └── graphql.ts         # GraphQLコード生成結果
│   └── lib/
│       └── graphql-client.ts  # GraphQLクライアント設定
├── graphql/                    # GraphQL定義
│   ├── schema.graphql         # スキーマ定義（参照用）
│   ├── queries.graphql        # クエリ定義
│   └── mutations.graphql      # ミューテーション定義
├── codegen.ts                 # GraphQL Code Generator設定
└── package.json
```

## 開発時の注意事項

1. **バックエンドサーバーの起動**: フロントエンドを起動する前に、バックエンドサーバー（`server/`ディレクトリ）を起動してください
2. **コード生成**: GraphQLスキーマやクエリを変更した場合は、`npm run codegen`を実行してコードを再生成してください
3. **TypeScriptエラー**: コード生成後、TypeScriptの型エラーが発生する場合は、IDEの再起動やTypeScriptサーバーの再起動を試してください
