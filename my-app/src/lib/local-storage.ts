// クライアント側のデータ管理（localStorage使用）

export interface LocalPost {
  id: string;
  title: string;
  body: string;
  tags: string[];
  publishedAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

const STORAGE_KEY = 'blog_posts';

// 記事一覧を取得
export function getLocalPosts(): LocalPost[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to read from localStorage:', error);
    return [];
  }
}

// 記事を保存
export function saveLocalPost(post: LocalPost): void {
  if (typeof window === 'undefined') return;
  
  try {
    const posts = getLocalPosts();
    // 既存の記事を更新、または新規追加
    const index = posts.findIndex((p) => p.id === post.id);
    if (index >= 0) {
      posts[index] = post;
    } else {
      posts.push(post);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// 記事を削除
export function deleteLocalPost(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const posts = getLocalPosts();
    const filtered = posts.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete from localStorage:', error);
  }
}

// IDで記事を取得
export function getLocalPost(id: string): LocalPost | null {
  const posts = getLocalPosts();
  return posts.find((p) => p.id === id) || null;
}

// 新しいIDを生成
export function generateLocalPostId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}


