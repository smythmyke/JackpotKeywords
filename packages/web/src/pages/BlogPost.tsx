import { useParams, Link, Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { getPostBySlug } from '../data/blog';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <>
      <Helmet>
        <title>{post.title} — JackpotKeywords Blog</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={post.keywords.join(', ')} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://jackpotkeywords.web.app/blog/${post.slug}`} />
        {post.heroImage && <meta property="og:image" content={post.heroImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: { '@type': 'Organization', name: post.author },
            publisher: { '@type': 'Organization', name: 'JackpotKeywords' },
            url: `https://jackpotkeywords.web.app/blog/${post.slug}`,
            ...(post.heroImage ? { image: post.heroImage } : {}),
          })}
        </script>
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 py-16">
        <Link to="/blog" className="text-sm text-gray-500 hover:text-gray-300 transition mb-6 inline-block">
          &larr; Back to Blog
        </Link>

        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-4 leading-tight">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{post.author}</span>
            <span>{post.date}</span>
            <span>{post.readTime}</span>
          </div>
        </header>

        <div className="prose prose-invert prose-lg max-w-none
          prose-headings:text-white prose-headings:font-bold
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-jackpot-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white
          prose-li:text-gray-300
          prose-table:border-gray-800
          prose-th:text-gray-400 prose-th:border-gray-800 prose-th:px-4 prose-th:py-2
          prose-td:text-gray-300 prose-td:border-gray-800 prose-td:px-4 prose-td:py-2
          prose-tr:border-gray-800
          prose-code:text-jackpot-400 prose-code:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-blockquote:border-jackpot-500 prose-blockquote:text-gray-400
        ">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-16 p-8 bg-gray-900 border border-gray-800 rounded-xl text-center">
          <h2 className="text-2xl font-bold mb-3">
            Ready to find your <span className="text-jackpot-400">goldmine keywords</span>?
          </h2>
          <p className="text-gray-400 mb-6">
            3 free searches. No credit card required. Results in under 30 seconds.
          </p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3 rounded-xl text-lg transition"
          >
            Start Your Free Search
          </Link>
        </div>
      </article>
    </>
  );
}
