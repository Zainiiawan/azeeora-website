import { Metadata, ResolvingMetadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import TableOfContents from '@/components/blog/TableOfContents';
import BlogCard from '@/components/blog/BlogCard';
import { Calendar, Clock, User, ChevronRight } from 'lucide-react';
import { config } from '@/lib/config';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPost(slug: string) {
  const dbPost = await db.blogPosts.findOne({ slug, isPublished: true });
  if (dbPost) return dbPost;
  const { blogPosts: staticPosts } = await import('@/lib/data/blog');
  return staticPosts.find(p => p.slug === slug);
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.slug);

  if (!post) {
    return {
      title: 'Post Not Found | Azeeora Cosmetics',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];
  const canonicalUrl = `${config.getBaseUrl()}/blog/${post.slug}`;

  return {
    title: `${post.title} | Azeeora Cosmetics Blog`,
    description: post.excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: canonicalUrl,
      type: 'article',
      publishedTime: post.publishDate,
      authors: [post.author],
      tags: post.tags,
      images: [
        {
          url: post.featuredImage.url,
          alt: post.featuredImage.alt,
        },
        ...previousImages,
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.featuredImage.url],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  // Get 2 related posts
  const allDbPosts = await db.blogPosts.find({ isPublished: true }, { sort: { publishDate: -1, createdAt: -1 } });
  const { blogPosts: staticPosts } = await import('@/lib/data/blog');
  const allPosts = allDbPosts.length > 0 ? allDbPosts : staticPosts;

  const relatedPosts = (allPosts as any[])
    .filter((p) => p.slug !== post.slug && (p.categories || []).some((c: string) => (post.categories || []).includes(c)))
    .slice(0, 2);

  // Fallback to random posts if no related posts found
  if (relatedPosts.length < 2) {
    const additional = (allPosts as any[])
      .filter((p) => p.slug !== post.slug && !relatedPosts.find((r) => r.slug === p.slug))
      .slice(0, 2 - relatedPosts.length);
    relatedPosts.push(...additional);
  }

  const formattedDate = new Date(post.publishDate || post.createdAt || new Date()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Schema Generation
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${config.getBaseUrl()}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${config.getBaseUrl()}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${config.getBaseUrl()}/blog/${post.slug}`,
      },
    ],
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    image: post.featuredImage.url,
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    author: [
      {
        '@type': 'Person',
        name: post.author,
      },
    ],
    publisher: {
      '@type': 'Organization',
      name: 'Azeeora Cosmetics',
      logo: {
        '@type': 'ImageObject',
        url: `${config.getBaseUrl()}/icon.png`,
      },
    },
    description: post.excerpt,
  };

  const imageObj = post.featuredImage
    ? (typeof post.featuredImage === 'string' ? { url: post.featuredImage, alt: post.title } : post.featuredImage)
    : { url: '/placeholder.png', alt: post.title };

  const faqSchema = post.faqs && post.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map((faq: any) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <nav className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-rose-gold transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/blog" className="hover:text-rose-gold transition-colors">Blog</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-md">
              {post.title}
            </span>
          </nav>
        </div>

        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="max-w-4xl mx-auto text-center">
            {post.categories && post.categories[0] && (
              <span className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-widest text-rose-gold uppercase bg-rose-gold/10 rounded-full">
                {post.categories[0]}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-gray-900 mb-8 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-rose-gold" />
                <span className="font-medium text-gray-900">{post.author || 'Admin'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-gold" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-gold" />
                <span>{post.readingTime || '5 min read'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      <div className="container mx-auto px-4 py-8 mb-8">
        <div className="max-w-4xl mx-auto relative w-full aspect-square md:aspect-video bg-gray-50 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center">
          <Image
            src={imageObj.url}
            alt={imageObj.alt}
            fill
            priority
            className="object-contain object-center p-4"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
          
          {/* Main Article */}
          <div className="lg:w-2/3 xl:w-3/4">
            <article 
              className="prose prose-lg max-w-none text-gray-700
                prose-headings:font-serif prose-headings:font-bold prose-headings:text-gray-900
                prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4
                prose-p:leading-relaxed prose-p:mb-6
                prose-a:text-rose-gold hover:prose-a:text-rose-gold/80
                prose-strong:text-gray-900 prose-strong:font-bold
                prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-6
                prose-li:mb-2
                [&>h2]:scroll-mt-32"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-bold text-gray-900 mr-2 py-1">Tags:</span>
                {post.tags.map((tag, i) => (
                  <span key={`${tag}-${i}`} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* FAQs */}
            {post.faqs && post.faqs.length > 0 && (
              <div className="mt-12">
                <h3 className="text-2xl font-serif font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {post.faqs.map((faq, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <h4 className="font-bold text-gray-900 mb-2">{faq.question}</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-1/3 xl:w-1/4 hidden lg:block">
            <TableOfContents />
          </aside>

        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="container mx-auto px-4 mt-20 pt-16 border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-8 text-center">Read Next</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {relatedPosts.map(post => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
