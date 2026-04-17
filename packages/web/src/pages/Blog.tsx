import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BLOG_POSTS, type BlogPost } from '../data/blog';

const CATEGORY_COLORS: Record<string, string> = {
  guide: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  comparison: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'use-case': 'bg-jackpot-500/10 text-jackpot-400 border-jackpot-500/30',
  tutorial: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  guide: 'Guide',
  comparison: 'Comparison',
  'use-case': 'Use Case',
  tutorial: 'Tutorial',
};

// Map posts to hero images by topic
const HERO_IMAGES: Record<string, string> = {
  // Analytics/tools posts
  'seo-keyword-analysis-tools': '/blog/hero-analytics-dashboard.jpg',
  'best-keyword-research-tool-2026': '/blog/hero-analytics-dashboard.jpg',
  'google-keyword-planner-guide': '/blog/hero-analytics-dashboard.jpg',
  'google-ads-keyword-planner-guide': '/blog/hero-analytics-dashboard.jpg',
  'google-keyword-research-tool': '/blog/hero-analytics-dashboard.jpg',
  'best-free-keyword-research-tools': '/blog/hero-analytics-dashboard.jpg',
  'free-keyword-research-tool': '/blog/hero-analytics-dashboard.jpg',
  // Search/discovery posts
  'what-is-keyword-research': '/blog/hero-search-discovery.jpg',
  'find-good-seo-keywords': '/blog/hero-search-discovery.jpg',
  'find-profitable-keywords': '/blog/hero-search-discovery.jpg',
  'how-to-find-low-competition-keywords': '/blog/hero-search-discovery.jpg',
  'find-competitor-keywords': '/blog/hero-search-discovery.jpg',
  // Comparison posts
  'jackpotkeywords-vs-semrush': '/blog/hero-comparison.jpg',
  'jackpotkeywords-vs-ahrefs': '/blog/hero-comparison.jpg',
  'semrush-competitor-analysis': '/blog/hero-comparison.jpg',
  'ubersuggest-alternative': '/blog/hero-comparison.jpg',
  'se-ranking-alternative': '/blog/hero-comparison.jpg',
  'mangools-alternative': '/blog/hero-comparison.jpg',
  'spyfu-free-alternative': '/blog/hero-comparison.jpg',
  'longtailpro-alternative': '/blog/hero-comparison.jpg',
  'semrush-open-source-alternative': '/blog/hero-comparison.jpg',
  // Growth/ads posts
  'ppc-keyword-research': '/blog/hero-growth-chart.jpg',
  // E-commerce posts
  'ecommerce-keyword-research': '/blog/hero-ecommerce.jpg',
  'keyword-research-for-etsy-sellers': '/blog/hero-ecommerce.jpg',
  // Video posts
  'youtube-keyword-research': '/blog/hero-video-youtube.jpg',
  // Local posts
  'local-seo-keyword-research': '/blog/hero-local-business.jpg',
  // AI/tech posts
  'ai-keyword-research': '/blog/hero-ai-technology.jpg',
  'keyword-clustering-seo': '/blog/hero-ai-technology.jpg',
  'free-seo-audit-tool': '/blog/hero-ai-technology.jpg',
  // Content/writing posts
  'keyword-research-new-website': '/blog/hero-content-writing.jpg',
  'keyword-research-for-saas': '/blog/hero-content-writing.jpg',
  // Audit posts
  'on-page-seo-checklist': '/blog/hero-audit-checklist.jpg',
  'how-to-do-seo-audit': '/blog/hero-audit-checklist.jpg',
};

const POSTS_PER_PAGE = 6;

function getHeroImage(slug: string): string {
  return HERO_IMAGES[slug] || '/blog/hero-content-writing.jpg';
}

export default function Blog() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Get unique categories with counts
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const post of BLOG_POSTS) {
      counts[post.category] = (counts[post.category] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  // Filter posts
  const filtered = useMemo(() => {
    let posts = BLOG_POSTS;

    if (activeCategory) {
      posts = posts.filter((p) => p.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      posts = posts.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    }

    return posts;
  }, [search, activeCategory]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  // Reset page when filters change
  function handleSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleCategory(cat: string | null) {
    setActiveCategory(cat);
    setCurrentPage(1);
  }

  return (
    <>
      <Helmet>
        <title>Blog — JackpotKeywords</title>
        <meta name="description" content="Keyword research guides, SEO tips, and marketing strategies for small businesses. Learn how to find goldmine keywords without expensive tools." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/blog" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-3">Blog</h1>
        <p className="text-gray-400 mb-8 text-lg">
          Keyword research guides, SEO tips, and marketing strategies for small businesses.
        </p>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search articles by topic, keyword, or tool name..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-jackpot-500 transition"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          <button
            onClick={() => handleCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              !activeCategory
                ? 'bg-jackpot-500/10 text-jackpot-400 border-jackpot-500/40'
                : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            All ({BLOG_POSTS.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => handleCategory(activeCategory === cat ? null : cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                activeCategory === cat
                  ? (CATEGORY_COLORS[cat] || 'bg-gray-800 text-white border-gray-700')
                  : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              {CATEGORY_LABELS[cat] || cat} ({count})
            </button>
          ))}
        </div>

        {/* Results count */}
        {(search || activeCategory) && (
          <p className="text-gray-500 text-sm mb-4">
            {filtered.length} article{filtered.length !== 1 ? 's' : ''} found
            {search && <> for &ldquo;{search}&rdquo;</>}
            {activeCategory && <> in {CATEGORY_LABELS[activeCategory] || activeCategory}</>}
          </p>
        )}

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {paginated.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition flex flex-col"
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden bg-gray-800">
                <img
                  src={getHeroImage(post.slug)}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                <span className={`absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.guide}`}>
                  {CATEGORY_LABELS[post.category] || post.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span>{post.date}</span>
                  <span>&middot;</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="text-base font-bold mb-2 group-hover:text-jackpot-400 transition leading-snug">
                  {post.title}
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 flex-1">
                  {post.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">No articles match your search.</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory(null); }}
              className="text-jackpot-400 text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition disabled:opacity-30 disabled:cursor-default"
            >
              &larr; Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                  page === currentPage
                    ? 'bg-jackpot-500 text-black'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition disabled:opacity-30 disabled:cursor-default"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </>
  );
}
