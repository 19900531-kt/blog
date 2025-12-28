'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { graphqlClient } from '@/lib/graphql-client';
import { useCreatePostMutation } from '@/generated/graphql';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, KeyboardEvent } from 'react';
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
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      body: '',
      tags: '',
      authorId: '1', // デフォルトでユーザーID 1を使用
    },
  });

  // タグを追加する関数
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      setValue('tags', newTags.join(','));
      setTagInput('');
    }
  };

  // タグを削除する関数
  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags.join(','));
  };

  // タグ入力フィールドのキーハンドラー
  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      }
    }
  };

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
        
        // 成功メッセージを先に表示（フォームを非表示にしてメッセージのみ表示）
        setShowSuccessMessage(true);
        
        // フォームのリセット（メッセージ表示時はフォームは非表示になるので不要だが、念のため）
        reset();
        setTags([]);
        setTagInput('');
        
        // 2秒後に詳細ページへ遷移（この前にonSuccess?.()を呼んで記事一覧を更新）
        setTimeout(() => {
          onSuccess?.(); // 記事一覧を更新
          if (data?.createPost?.id) {
            router.push(`/posts/${data.createPost.id}`);
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
            
            // 成功メッセージを先に表示（フォームを非表示にしてメッセージのみ表示）
            setShowSuccessMessage(true);
            
            // フォームのリセット（メッセージ表示時はフォームは非表示になるので不要だが、念のため）
            reset();
            setTags([]);
            setTagInput('');
            
            // 2秒後に詳細ページへ遷移（この前にonSuccess?.()を呼んで記事一覧を更新）
            setTimeout(() => {
              onSuccess?.(); // 記事一覧を更新
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
    // 最後に入力中のタグがあれば追加
    if (tagInput.trim()) {
      addTag(tagInput);
    }

    // タグの配列を使用（既にstateで管理している）
    const tagsArray = tags.length > 0 ? tags : [];

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

  // 成功メッセージが表示されている場合は、フォーム全体を非表示にしてメッセージのみ表示
  if (showSuccessMessage) {
    return (
      <div className="bg-green-100 border-2 border-green-500 rounded-lg p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <div className="text-green-800 font-bold text-lg">成功しました。</div>
            <p className="text-green-700 text-sm mt-1">記事が作成されました。詳細ページに遷移します...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <label htmlFor="tagInput" className="block text-sm font-medium text-gray-700 mb-1">
          タグ
        </label>
        <div className="space-y-2">
          {/* タグ表示エリア */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    disabled={isLoading}
                    className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none disabled:opacity-50"
                    aria-label={`${tag}を削除`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* タグ入力フィールド */}
          <input
            id="tagInput"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="タグを入力してEnterまたはカンマを押してください"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          {/* 非表示のフィールド（フォームバリデーション用） */}
          <input type="hidden" {...register('tags')} />
        </div>
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

