import { GraphQLClient } from 'graphql-request';

// 環境変数からGraphQLエンドポイントを取得、なければデフォルトのローカルサーバーを使用
const getGraphQLEndpoint = (): string => {
  // ブラウザ環境では process.env.NEXT_PUBLIC_ で始まる環境変数を使用
  if (typeof window !== 'undefined') {
    // クライアント側では環境変数から取得
    const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;
    if (endpoint) {
      return endpoint;
    }
  }
  
  // デフォルトはローカルサーバー
  return 'http://127.0.0.1:8000/api/graphql';
};

export const graphqlClient = new GraphQLClient(getGraphQLEndpoint());

