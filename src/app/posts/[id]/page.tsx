import { PostDetail } from '@/components/PostDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <main className="max-w-4xl mx-auto px-4">
        <PostDetail postId={id} />
      </main>
    </div>
  );
}

