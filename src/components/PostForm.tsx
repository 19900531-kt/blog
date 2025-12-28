'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { graphqlClient } from '@/lib/graphql-client';
import { useCreatePostMutation } from '@/generated/graphql';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveLocalPost, generateLocalPostId, type LocalPost } from '@/lib/local-storage';

const postSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内で入力してください'),
  body: z.string().min(1, '本文は必須です').max(5000, '本文は5000文字以内で入力してください'),
  tags: z.string().optional(),
  authorId: z.string().min(1, '作者IDは必須です'),
});

type PostFormData = z.infer<typeof postSchema>;

interface PostFormProps {
  onSuccess?: () => void;
}

// 固定値の著者リスト（サーバーに存在するユーザーID）
const AUTHORS = [
  { id: '1', name: '髙橋慶祐' },
  { id: '2', name: '佐藤太郎' },
  { id: '3', name: '鈴木花子' },
  { id: '4', name: '伊藤次郎' },
  { id: '5', name: '加藤三郎' },
];

export function PostForm({ onSuccess }: PostFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      body: '',
      tags: '',
      authorId: '1', // デフォルトでユーザーID 1を使用
    },
  });

  const createMutation = useCreatePostMutation(
    graphqlClient,
    {
      onSuccess: async (data) => {
        // サーバーに保存された記事もlocalStorageに保存（バックアップ）
        if (data?.createPost) {
          const localPost: LocalPost = {
            id: data.createPost.id,
            title: data.createPost.title,
            body: data.createPost.body,
            tags: data.createPost.tags || [],
            publishedAt: data.createPost.publishedAt,
            author: {
              id: data.createPost.author.id,
              name: data.createPost.author.name,
              avatarUrl: data.createPost.author.avatarUrl || null,
            },
          };
          saveLocalPost(localPost);
        }
        
        // 記事一覧のクエリを無効化して再取得
        try {
          await queryClient.invalidateQueries({ queryKey: ['GetPosts'] });
          await queryClient.refetchQueries({ queryKey: ['GetPosts'] });
        } catch (e) {
          // サーバーが利用できない場合は無視
        }
        
        reset();
        
        // onSuccessコールバックを先に呼び出して記事一覧を更新
        onSuccess?.();
        
        // 成功メッセージを表示
        setShowSuccessMessage(true);
        
        // 2秒後に詳細ページへ遷移
        setTimeout(() => {
          if (data?.createPost?.id) {
            router.push(`/posts/${data.createPost.id}`);
          } else {
            setShowSuccessMessage(false);
          }
        }, 2000);
      },
      onError: async (error, variables) => {
        // サーバー接続エラーの場合、localStorageに保存
        if (error instanceof Error) {
          const message = error.message;
          if (message.includes('Failed to fetch') || message.includes('fetch') || message.includes('Network')) {
            console.warn('サーバーに接続できません。ローカルストレージに保存します。');
            
            // フォームデータからlocalStorageに保存
            const tagsArray: string[] = variables.input.tags || [];
            const selectedAuthor = AUTHORS.find((a) => a.id === variables.input.authorId);
            const authorName = selectedAuthor?.name || '不明';
            
            const localPost: LocalPost = {
              id: generateLocalPostId(),
              title: variables.input.title,
              body: variables.input.body,
              tags: tagsArray,
              publishedAt: new Date().toISOString(),
              author: {
                id: variables.input.authorId,
                name: authorName,
                avatarUrl: null,
              },
            };
            
            saveLocalPost(localPost);
            
            // 記事一覧を更新
            await queryClient.invalidateQueries({ queryKey: ['GetPosts'] });
            reset();
            setShowSuccessMessage(true);
            onSuccess?.();
            
            // 2秒後に詳細ページへ遷移
            setTimeout(() => {
              router.push(`/posts/${localPost.id}`);
            }, 2000);
            
            return;
          }
        }
        console.error('投稿作成エラー:', error);
      },
    },
    undefined
  );

  const onSubmit = (data: PostFormData) => {
    // カンマ区切りのタグ文字列を配列に変換
    const tagsArray: string[] = data.tags
      ? data.tags
          .split(',') // カンマで分割
          .map((tag) => tag.trim()) // 前後の空白を削除
          .filter((tag) => tag.length > 0) // 空文字列を除外
      : [];

    // サーバーに送信を試みる（エラー時はonErrorでlocalStorageに保存）
    createMutation.mutate({
      input: {
        title: data.title,
        body: data.body,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        authorId: data.authorId,
      },
    });
  };

  const isLoading = createMutation.isPending;
  const error = createMutation.error;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-600 font-semibold mb-1">記事が作成されました</div>
          <p className="text-green-500 text-sm">詳細ページに遷移します...</p>
        </div>
      )}
      {/* サーバーエラー（Failed to fetch等）は表示しない */}
      {error && error instanceof Error && !error.message.includes('Failed to fetch') && !error.message.includes('fetch') && !error.message.includes('Network') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 font-semibold mb-1">記事の作成に失敗しました</div>
          <p className="text-red-500 text-sm">
            {error.message}
          </p>
        </div>
      )}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          タイトル<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="title"
          type="text"
          {...register('title')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
          本文<span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          id="body"
          {...register('body')}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        />
        {errors.body && (
          <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
          タグ（カンマ区切り）
        </label>
        <input
          id="tags"
          type="text"
          {...register('tags')}
          placeholder="例: プログラミング, GraphQL, React"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        />
        {errors.tags && (
          <p className="mt-1 text-sm text-red-600">{errors.tags.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="authorId" className="block text-sm font-medium text-gray-700 mb-1">
          著者
        </label>
        <select
          id="authorId"
          {...register('authorId')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          disabled={isLoading}
        >
          {AUTHORS.map((author) => (
            <option key={author.id} value={author.id}>
              {author.name}（ID: {author.id}）
            </option>
          ))}
        </select>
        {errors.authorId && (
          <p className="mt-1 text-sm text-red-600">{errors.authorId.message}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '保存中...' : '作成'}
        </button>
        {onSuccess && (
          <button
            type="button"
            onClick={onSuccess}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

