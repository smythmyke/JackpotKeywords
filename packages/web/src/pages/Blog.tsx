import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BLOG_POSTS } from '../data/blog';

const CATEGORY_COLORS: Record<string, string> = {
  guide: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  comparison: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'use-case': 'bg-jackpot-500/10 text-jackpot-400 border-jackpot-500/30',
  tutorial: 'bg-green-500/10 text-green-400 border-green-500/30',
};

export default function Blog() {
  return (
    <>
      <Helmet>
        <title>Blog — JackpotKeywords</title>
        <meta name="description" content="Keyword research guides, SEO tips, and marketing strategies for small businesses. Learn how to find goldmine keywords without expensive tools." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/blog" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-3">Blog</h1>
        <p className="text-gray-400 mb-12 text-lg">
          Keyword research guides, SEO tips, and marketing strategies for small businesses.
        </p>

        <div className="space-y-8">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.guide}`}>
                  {post.category}
                </span>
                <span className="text-xs text-gray-500">{post.date}</span>
                <span className="text-xs text-gray-500">{post.readTime}</span>
              </div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-jackpot-400 transition">
                {post.title}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                {post.description}
              </p>
            </Link>
          ))}
        </div>

        {BLOG_POSTS.length === 0 && (
          <p className="text-gray-500 text-center py-20">Coming soon.</p>
        )}
      </div>
    </>
  );
}
