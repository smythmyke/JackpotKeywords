/**
 * AEO Scan — A-1 Standalone Script
 *
 * Tests whether Gemini grounding returns usable citation data
 * for determining AI visibility of a product.
 *
 * Usage: node scripts/aeo-scan/index.mjs
 *
 * Requires: GEMINI_API_KEY in environment or ../.env
 */

import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load API key from functions .env if not in environment
if (!process.env.GEMINI_API_KEY) {
  try {
    const envFile = readFileSync(resolve(__dirname, '../../packages/functions/.env'), 'utf-8');
    const match = envFile.match(/GEMINI_API_KEY=(.+)/);
    if (match) process.env.GEMINI_API_KEY = match[1].trim();
  } catch { /* ignore */ }
}

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not found. Set it in env or packages/functions/.env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Configuration ────────────────────────────────────────────

const PRODUCT = {
  name: 'JackpotKeywords',
  url: 'https://jackpotkeywords.web.app',
  description: 'AI-powered keyword research tool that generates 1,000+ keywords from a plain English product description. Uses real Google Ads API data (not estimates) with 12 intent categories, Jackpot Score ranking, keyword clustering, and free SEO audits. $9.99/month — 14x cheaper than SEMrush.',
};

const QUERY_COUNT = 8;
const MODEL = process.env.AEO_MODEL || 'gemini-2.5-flash';

// ── Step 1: Generate buyer-voice queries ─────────────────────

async function generateBuyerQueries(product) {
  console.log('\n=== Step 1: Generating buyer-voice queries ===\n');

  const prompt = `You are simulating real buyers searching for a product like this:

Product: ${product.name}
URL: ${product.url}
Description: ${product.description}

Generate ${QUERY_COUNT} realistic queries that a potential buyer would type into an AI assistant (ChatGPT, Gemini, Perplexity) when looking for this type of tool. These should be natural questions, NOT keyword fragments.

Mix these types:
- Direct product searches ("What's the best keyword research tool?")
- Problem-based ("How do I find keywords without paying for SEMrush?")
- Comparison ("What are cheaper alternatives to Ahrefs?")
- Use-case specific ("Best tool for finding keywords for a new Etsy shop")
- Feature-specific ("Is there a keyword tool that shows real Google Ads data?")

Return ONLY a JSON array of strings, no markdown:
["query 1", "query 2", ...]`;

  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });
      break;
    } catch (err) {
      if (attempt < 3 && (err.message?.includes('503') || err.message?.includes('UNAVAILABLE'))) {
        console.log(`  → 503, retrying in ${attempt * 5}s...`);
        await new Promise((r) => setTimeout(r, attempt * 5000));
        continue;
      }
      throw err;
    }
  }

  const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
  const queries = JSON.parse(text);
  queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  return queries;
}

// ── Step 2: Run grounded search for each query ───────────────

async function groundedSearch(query, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const metadata = response.candidates?.[0]?.groundingMetadata;
      const chunks = metadata?.groundingChunks || [];
      const citations = chunks
        .filter((c) => c.web)
        .map((c) => ({
          url: c.web.uri,
          title: c.web.title || '',
        }));

      const searchQueries = metadata?.webSearchQueries || [];
      const answerText = response.text || '';

      return { query, citations, searchQueries, answerText };
    } catch (err) {
      if (attempt < retries && (err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || err.message?.includes('overloaded'))) {
        const delay = attempt * 3000;
        process.stdout.write(`    → 503, retrying in ${delay / 1000}s (${attempt}/${retries})...`);
        await new Promise((r) => setTimeout(r, delay));
        console.log('');
        continue;
      }
      throw err;
    }
  }
}

// ── Step 3: Analyze citations ────────────────────────────────

function analyzeCitations(results, product) {
  const productDomain = new URL(product.url).hostname.replace('www.', '');
  const productMentionPatterns = [
    product.name.toLowerCase(),
    productDomain,
  ];

  const analysis = results.map((r) => {
    const citedByUs = r.citations.some((c) => {
      const citUrl = c.url.toLowerCase();
      const citTitle = c.title.toLowerCase();
      return productMentionPatterns.some((p) => citUrl.includes(p) || citTitle.includes(p));
    });

    const mentionedInText = productMentionPatterns.some((p) =>
      r.answerText.toLowerCase().includes(p)
    );

    // Find competitor mentions in citations
    const knownCompetitors = ['semrush', 'ahrefs', 'ubersuggest', 'moz', 'se ranking', 'mangools', 'kwfinder', 'spyfu', 'longtailpro', 'keyword tool', 'surfer seo'];
    const competitorsCited = [];
    for (const comp of knownCompetitors) {
      const inCitations = r.citations.some((c) =>
        c.url.toLowerCase().includes(comp.replace(/\s/g, '')) ||
        c.title.toLowerCase().includes(comp)
      );
      const inText = r.answerText.toLowerCase().includes(comp);
      if (inCitations || inText) competitorsCited.push(comp);
    }

    return {
      query: r.query,
      totalCitations: r.citations.length,
      productCited: citedByUs,
      productMentionedInAnswer: mentionedInText,
      competitorsCited,
      topCitations: r.citations.slice(0, 5),
      searchQueries: r.searchQueries,
    };
  });

  return analysis;
}

// ── Step 4: Score and report ─────────────────────────────────

function generateReport(analysis, product) {
  console.log('\n' + '='.repeat(70));
  console.log(`  AEO SCAN REPORT: ${product.name}`);
  console.log(`  URL: ${product.url}`);
  console.log('='.repeat(70));

  const totalQueries = analysis.length;
  const citedCount = analysis.filter((a) => a.productCited).length;
  const mentionedCount = analysis.filter((a) => a.productMentionedInAnswer).length;
  const visibilityScore = Math.round(((citedCount + mentionedCount) / (totalQueries * 2)) * 100);

  console.log(`\n  VISIBILITY SCORE: ${visibilityScore}/100`);
  console.log(`  Product cited in sources: ${citedCount}/${totalQueries} queries`);
  console.log(`  Product named in answers: ${mentionedCount}/${totalQueries} queries`);

  // Competitor frequency
  const competitorFreq = {};
  for (const a of analysis) {
    for (const comp of a.competitorsCited) {
      competitorFreq[comp] = (competitorFreq[comp] || 0) + 1;
    }
  }
  const sortedCompetitors = Object.entries(competitorFreq).sort((a, b) => b[1] - a[1]);

  if (sortedCompetitors.length > 0) {
    console.log('\n  COMPETITOR DOMINANCE:');
    for (const [comp, count] of sortedCompetitors) {
      const bar = '#'.repeat(Math.round((count / totalQueries) * 20));
      console.log(`    ${comp.padEnd(15)} ${bar} ${count}/${totalQueries} queries`);
    }
  }

  // Per-query detail
  console.log('\n' + '-'.repeat(70));
  console.log('  PER-QUERY RESULTS');
  console.log('-'.repeat(70));

  for (const a of analysis) {
    const status = a.productCited ? 'CITED' : a.productMentionedInAnswer ? 'MENTIONED' : 'NOT FOUND';
    const icon = a.productCited ? '[+]' : a.productMentionedInAnswer ? '[~]' : '[-]';
    console.log(`\n  ${icon} "${a.query}"`);
    console.log(`      Status: ${status} | Citations: ${a.totalCitations} | Competitors: ${a.competitorsCited.join(', ') || 'none'}`);
    if (a.topCitations.length > 0) {
      console.log('      Top sources:');
      for (const c of a.topCitations.slice(0, 3)) {
        const isUs = c.url.toLowerCase().includes(product.name.toLowerCase()) || c.url.toLowerCase().includes(new URL(product.url).hostname);
        console.log(`        ${isUs ? '>>>' : '   '} ${c.title || c.url}`);
        console.log(`            ${c.url}`);
      }
    }
  }

  // Action items
  console.log('\n' + '-'.repeat(70));
  console.log('  ACTION ITEMS');
  console.log('-'.repeat(70));

  const notFound = analysis.filter((a) => !a.productCited && !a.productMentionedInAnswer);
  if (notFound.length > 0) {
    console.log(`\n  COVERAGE GAPS (${notFound.length} queries with zero presence):`);
    for (const a of notFound) {
      console.log(`    - "${a.query}"`);
      if (a.competitorsCited.length > 0) {
        console.log(`      Competitors present: ${a.competitorsCited.join(', ')}`);
      }
    }
  }

  const mentionedOnly = analysis.filter((a) => a.productMentionedInAnswer && !a.productCited);
  if (mentionedOnly.length > 0) {
    console.log(`\n  WEAK PRESENCE (mentioned but not cited as source — ${mentionedOnly.length} queries):`);
    for (const a of mentionedOnly) {
      console.log(`    - "${a.query}"`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('  SCAN COMPLETE');
  console.log('='.repeat(70) + '\n');

  return { visibilityScore, citedCount, mentionedCount, totalQueries, competitorFreq };
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('AEO Scan — A-1 Test Script');
  console.log(`Target: ${PRODUCT.name} (${PRODUCT.url})`);
  console.log(`Model: ${MODEL} with Google Search grounding`);

  try {
    // Step 1: Generate queries
    const queries = await generateBuyerQueries(PRODUCT);

    // Step 2: Run grounded searches
    console.log('\n=== Step 2: Running grounded searches ===\n');
    const results = [];
    for (let i = 0; i < queries.length; i++) {
      console.log(`  [${i + 1}/${queries.length}] "${queries[i].substring(0, 60)}..."`);
      try {
        const result = await groundedSearch(queries[i]);
        results.push(result);
        console.log(`    → ${result.citations.length} citations found`);
      } catch (err) {
        console.log(`    → ERROR: ${err.message}`);
        results.push({ query: queries[i], citations: [], searchQueries: [], answerText: '' });
      }
      // Small delay between requests
      if (i < queries.length - 1) await new Promise((r) => setTimeout(r, 500));
    }

    // Step 3: Analyze
    console.log('\n=== Step 3: Analyzing citations ===');
    const analysis = analyzeCitations(results, PRODUCT);

    // Step 4: Report
    const summary = generateReport(analysis, PRODUCT);

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
