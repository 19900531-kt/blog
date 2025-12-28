'use client';

import { graphqlClient } from '@/lib/graphql-client';
import { useGetPostsQuery } from '@/generated/graphql';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PostForm } from './PostForm';
import { useQueryClient } from '@tanstack/react-query';
import { getLocalPosts, type LocalPost } from '@/lib/local-storage';
import { useRouter } from 'next/navigation';

export function PostList() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [localPosts, setLocalPosts] = useState<LocalPost[]>([]);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, error, refetch } = useGetPostsQuery(
    graphqlClient,
    undefined,
    {
      retry: false, // リトライを無効化
      refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    }
  );

  // localStorageから記事を読み込む
  useEffect(() => {
    const posts = getLocalPosts();
    setLocalPosts(posts);
  }, []);

  const handleCreateSuccess = async () => {
    // サーバーから再取得を試みる
    try {
      await queryClient.invalidateQueries({ queryKey: ['GetPosts'] });
      await refetch();
    } catch (e) {
      // サーバーが利用できない場合は無視
    }
    // localStorageからも再読み込み
    const posts = getLocalPosts();
    setLocalPosts(posts);
    // 成功メッセージ表示後にフォームを閉じる（PostFormのsetTimeout内で呼ばれる）
    setShowCreateForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  // エラーが発生した場合は空の状態として扱う（エラーを表示しない）

  // サーバーからのデータとlocalStorageのデータをマージ
  const serverPosts = data?.posts || [];
  
  // localStorageのデータをサーバーのデータ形式に変換
  const convertedLocalPosts = localPosts.map((localPost) => ({
    id: localPost.id,
    title: localPost.title,
    publishedAt: localPost.publishedAt,
    author: {
      name: localPost.author.name,
    },
  }));
  
  const allPosts = [...serverPosts, ...convertedLocalPosts];
  
  // 重複を除去（IDで判定）
  const uniquePosts = allPosts.reduce((acc, post) => {
    if (!acc.find((p) => p.id === post.id)) {
      acc.push(post);
    }
    return acc;
  }, [] as typeof allPosts);

  // 投稿日で降順ソート
  const posts = uniquePosts.slice().sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA; // 降順
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">記事一覧</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {showCreateForm ? 'キャンセル' : '新規作成'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">新規記事を作成</h2>
          <PostForm onSuccess={handleCreateSuccess} />
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">投稿がありません</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:bg-blue-50 active:bg-blue-100"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2 transition-colors duration-200 hover:text-blue-600 active:text-blue-700">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="transition-colors duration-200 hover:text-blue-600">
                      著者: {post.author.name}
                    </span>
                    <span className="transition-colors duration-200 hover:text-blue-600">
                      投稿日: {new Date(post.publishedAt).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

