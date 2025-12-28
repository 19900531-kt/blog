'use client';

import { graphqlClient } from '@/lib/graphql-client';
import { useGetPostQuery, useDeletePostMutation } from '@/generated/graphql';
import { useRouter } from 'next/navigation';
import { getLocalPost, deleteLocalPost, type LocalPost } from '@/lib/local-storage';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PostDetailProps {
  postId: string;
}

export function PostDetail({ postId }: PostDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [localPost, setLocalPost] = useState<LocalPost | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data, isLoading, error } = useGetPostQuery(
    graphqlClient,
    { id: postId },
    {
      retry: false, // リトライを無効化
      refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    }
  );

  const deleteMutation = useDeletePostMutation(
    graphqlClient,
    {
      onSuccess: async () => {
        // localStorageからも削除
        if (postId.startsWith('local_')) {
          deleteLocalPost(postId);
        }
        // 記事一覧を更新
        await queryClient.invalidateQueries({ queryKey: ['GetPosts'] });
        // ホームページにリダイレクト
        router.push('/');
      },
      onError: async (error) => {
        // サーバーエラーの場合でも、localStorageから削除を試みる
        if (postId.startsWith('local_')) {
          deleteLocalPost(postId);
          await queryClient.invalidateQueries({ queryKey: ['GetPosts'] });
          router.push('/');
        } else {
          console.error('記事削除エラー:', error);
        }
      },
    },
    undefined
  );

  // localStorageから記事を読み込む
  useEffect(() => {
    if (postId.startsWith('local_')) {
      const post = getLocalPost(postId);
      setLocalPost(post);
    }
  }, [postId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  // エラーが発生した場合は「投稿が見つかりません」として扱う
  // ただし、localStorageにデータがある場合はそれを使用

  const post = data?.post || (localPost ? {
    id: localPost.id,
    title: localPost.title,
    body: localPost.body,
    tags: localPost.tags,
    publishedAt: localPost.publishedAt,
    author: {
      id: localPost.author.id,
      name: localPost.author.name,
      avatarUrl: localPost.author.avatarUrl,
    },
  } : null);

  if (!post && !isLoading) {
    return (
      <div className="space-y-6">
        {/* パンくずリストとナビゲーション */}
        <div className="flex items-center justify-between mb-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <button
              onClick={() => router.push('/')}
              className="hover:text-blue-600 transition-colors"
            >
              ホーム
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">記事詳細</span>
          </nav>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            一覧に戻る
          </button>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-800 font-semibold mb-2">投稿が見つかりません</div>
          <p className="text-yellow-700 text-sm mb-4">指定されたIDの投稿は存在しません。</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  // postは上で定義済み

  return (
    <div className="space-y-6">
      {/* パンくずリストとナビゲーション */}
      <div className="flex items-center justify-between mb-4">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={() => router.push('/')}
            className="hover:text-blue-600 transition-colors"
          >
            ホーム
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">記事詳細</span>
        </nav>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          一覧に戻る
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

        {/* 投稿日 */}
        <div className="mb-6 text-sm text-gray-500 border-b pb-4">
          <p>
            投稿日: {new Date(post.publishedAt).toLocaleString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* 著者名・アバター */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">著者</h2>
          <div className="flex items-center gap-4">
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-lg font-semibold">
                  {post.author.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-lg font-medium text-gray-900">{post.author.name}</p>
            </div>
          </div>
        </div>

        {/* 本文 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">本文</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.body}</p>
          </div>
        </div>

        {/* タグ */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">タグ</h2>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 削除ボタン */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleteMutation.isPending ? '削除中...' : '記事を削除'}
          </button>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">記事を削除しますか？</h3>
            <p className="text-gray-600 mb-6">この操作は取り消せません。記事が完全に削除されます。</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate({ id: postId });
                  setShowDeleteConfirm(false);
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteMutation.isPending ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

