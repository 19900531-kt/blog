import { PostList } from '@/components/PostList';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <main className="max-w-4xl mx-auto px-4">
        <PostList />
      </main>
    </div>
  );
}
