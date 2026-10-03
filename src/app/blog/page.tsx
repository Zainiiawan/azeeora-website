import { config } from '@/lib/config';
import { Metadata } from 'next';
import { blogPosts } from '@/lib/data/blog';
import BlogCard from '@/components/blog/BlogCard';
import BlogSidebar from '@/components/blog/BlogSidebar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Beauty Blog & Skincare Tips | Azeeora Cosmetics',
  description: 'Discover the latest skincare tips, makeup tutorials, and beauty secrets from Azeeora Cosmetics experts. Achieve your flawless look today.',
  openGraph: {
    title: 'Beauty Blog & Skincare Tips | Azeeora Cosmetics',
    description: 'Discover the latest skincare tips, makeup tutorials, and beauty secrets from Azeeora Cosmetics experts.',
    url: `${config.getBaseUrl()}/blog`,
    type: 'website',
  },
};

export default function BlogListingPage() {
  const featuredPost = blogPosts[0];
  const remainingPosts = blogPosts.slice(1);
  
  // Extract unique categories and tags for the sidebar
  const categories = Array.from(new Set(blogPosts.flatMap(post => post.categories)));
  const tags = Array.from(new Set(blogPosts.flatMap(post => post.tags)));

  // Generate CollectionPage JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Azeeora Cosmetics Beauty Blog',
    description: 'Expert skincare tips, makeup tutorials, and beauty news.',
    url: `${config.getBaseUrl()}/blog`,
    hasPart: blogPosts.map((post) => ({
      '@type': 'Article',
      headline: post.title,
      url: `${config.getBaseUrl()}/blog/${post.slug}`,
      author: {
        '@type': 'Person',
        name: post.author,
      },
      datePublished: post.publishDate,
    }))
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-sm text-gray-500 flex items-center gap-2">
            <Link href="/" className="hover:text-rose-gold transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Blog</span>
          </nav>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200 pb-12 pt-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-black mb-4">
            The <span className="text-rose-gold">Beauty</span> Edit
          </h1>
          <p className="text-gray-600 text-lg">
            Expert advice, skincare routines, and makeup tips to help you achieve your most radiant self.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          
          <div className="lg:w-2/3 xl:w-3/4 flex flex-col gap-10">
            {/* Featured Post */}
            {featuredPost && (
              <section>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Featured Story</h2>
                <BlogCard post={featuredPost} featured />
              </section>
            )}

            {/* Grid Posts */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Latest Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {remainingPosts.map((post) => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          </div>

          <div className="lg:w-1/3 xl:w-1/4">
            <BlogSidebar categories={categories} tags={tags} />
          </div>

        </div>
      </div>
    </div>
  );
}
