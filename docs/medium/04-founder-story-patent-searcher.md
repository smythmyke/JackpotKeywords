# I Spent a Week Hunting a Single Patent. It's Why I Built a Keyword Research Tool.

*How a piston-pin lubricant, forty hours of Boolean queries, and a hotel in India turned into a $9.99 SaaS.*

---

There's a specific kind of tired that comes from staring at patent databases for forty straight hours.

I was hunting prior art for an invention disclosure — a particular lubricant applied to the piston pin of an internal combustion engine. My job was to find out whether anyone, anywhere in the world, had ever described that exact combination before. In a patent, a paper, a manual, a forum post from 1998 that had somehow been indexed.

If I found it, the invention wasn't novel and the application was doomed.

If I didn't find it, the invention was *probably* novel. But I'd also know there was a real possibility I'd just missed it.

That's the part nobody outside patent search understands. You're never finished. You stop because you've exhausted your time budget, not because you've exhausted the search space. Five days, forty-plus hours of Boolean queries — *piston AND pin AND (lubricant OR coating OR film) AND (combustion OR ICE)* and a hundred variations — and I came up empty. Maybe the prior art existed and I missed it. Maybe it didn't exist and the inventor really had something new. There was no way to know for sure. This was before AI made any of it easier.

When I left patents to work full-time on my own projects, I thought I was leaving that feeling behind.

I was wrong. I'd just renamed it. Now it's called keyword research.

## The same job, different corpus

Patent search and keyword research are the same cognitive task wearing different clothes.

Both are about finding specific terms in a massive, messy corpus where missing the right one is expensive. In patents, missing prior art means a client gets sued. In keyword research, missing the right keyword means you spend a year writing content for terms nobody searches, or bidding on phrases your competitors already own.

Both reward the same skill: knowing how to construct a query, knowing which synonyms to try, knowing how to organize results so you can actually evaluate what you've found. Both punish the same shortcomings: tunnel vision, premature filtering, trusting the first hundred results when the gold is on page eight.

When I started shipping Chrome extensions and small SaaS products on the side, I needed keyword research. A lot of it. Every product needed market validation, every landing page needed targeting, every Google Ads campaign needed a keyword list. Same problem, twelve different times.

The available tools weren't built for someone like me.

## The two bad options

If you're a solo developer or a small founder, you have two real choices for keyword research. Both have serious problems.

**Option one is Google's free tools.** Keyword Planner is authoritative — it's the source data — but Google won't show you exact volumes unless you're actively spending on ads. Everything is a range: 1K–10K, 10K–100K. That's an eight-fold spread on the metric you most need to be precise about. Add in autocomplete and the People Also Ask box and you can scrape together some ideas, but you can't run bulk queries, can't review 2,000 keywords in a sitting, can't sort or score anything systematically. It's the patent-search equivalent of typing one Boolean string and hoping.

**Option two is the paid suites.** SEMrush, Ahrefs, Moz — all genuinely powerful, all priced for agencies. SEMrush starts at $140/month. That's $1,680 a year for a tool I needed for a handful of research sessions per project. For one project, the math is offensive. For the dozen projects I had at any given time, the math was impossible.

I was stuck doing keyword research the way I'd done patent search: opening twenty browser tabs, manually cross-referencing volume estimates against Google Trends, copying terms into spreadsheets, eyeballing competition. It was the same forty-hours-and-still-not-sure feeling I'd left a career to escape.

So I built the tool I wanted.

## What JackpotKeywords does, and why it does it that way

[JackpotKeywords](https://jackpotkeywords.web.app) solves the specific problem that frustrated me. Three principles drove the design, and all three trace back to patent search habits I couldn't unlearn.

**First, it pulls from the source data, not estimates.** Every keyword's volume, CPC, competition, and trend direction comes directly from the Google Ads API — the same data Keyword Planner uses, without the ranges. No clickstream estimates, no proprietary panels. If Google says a keyword gets 6,600 searches a month, that's what you see. In patent search, you learn early to distrust derived data and go to the primary source. Same instinct, applied to keywords.

**Second, you describe your product in plain English.** No seed keywords required. Most tools assume you already know which terms to search for — which is the patent-search problem in reverse, where you can only find what you already know to look for. JackpotKeywords lets you type *"handmade soy candles sold on Etsy"* or *"project management software for remote teams"* and the AI generates seed terms for you, then expands across twelve intent categories: direct, feature-based, problem-based, audience-based, competitor brand, "alternative to," use case, industry, benefit, adjacent, seasonal, and local.

The classification is borrowed straight from patent landscape work. When you analyze a patent landscape, you don't dump every relevant patent into one bucket — you organize by claim type, by application area, by inventor, by technology cluster. Keywords have the same structure if you bother to surface it. Most tools don't.

**Third, every result is scored and ranked.** Each keyword gets a Jackpot Score that combines volume, relevance, CPC, competition, and trend into a single number. The point is to surface the *underused* keywords with high commercial value — the ones with real search volume and real CPC but low competition, hiding in the long tail. Those are the jackpots. That's where the name comes from.

I wanted a tool that gave me what a good patent landscape report gives a client: organized, scored, source-grounded, and actually possible to act on in an afternoon. Not a flat list of 5,000 phrases I'd need another tool to make sense of.

## Why $9.99

Pricing was the easy decision. I wanted other people in my position — solo founders, small business owners, people building things on the side — to actually be able to afford it. SEMrush at $140/month isn't a tool for that audience. It's a tool for agencies billing clients.

So I priced it where I would have wanted to pay: under ten dollars a month, with three free full searches before you commit to anything. If the tool isn't useful in three searches, it isn't useful, and you shouldn't pay to find that out.

JackpotKeywords isn't a venture bet. There's no growth team, no sales department, no investor pressure to mark up the price to justify a Series A. It's a product I needed and that other people seem to need too, priced for the people who actually need it.

## The hotel in India

A few weeks ago, I was reviewing search logs and saw a query from a user in India. I dug in a little. It was a nice hotel — clearly running a real marketing operation, looking for keyword opportunities in a specific regional market.

That moment hit me harder than I expected.

When I built JackpotKeywords, I built it for me. I built it for the version of myself launching a Chrome extension on a Saturday night with no marketing budget, trying to figure out which terms were worth targeting. I didn't really think past that. The audience in my head was *people exactly like me*.

Then I watched a hotel in India — on the other side of the world, in an industry I know nothing about, serving a customer base I'll never meet — using the same tool to make the same kind of decision I built it for. That's the part of indie SaaS nobody tells you about. The tool stops being yours pretty quickly. It becomes whatever your users need it to be.

## What I want you to take from this

If you've ever spent a week looking for something in a database and walked away unsure whether it was there or not, you understand what I built JackpotKeywords for.

It's the tool I wished I'd had during a hundred late-night keyword research sessions for products I was launching with no budget. It's also, in a real sense, the tool I wished I'd had during a forty-hour patent search for a piston pin lubricant that may or may not have ever existed.

You can [try it free](https://jackpotkeywords.web.app) — three full searches, no credit card. Describe your product in plain English, and you'll get a thousand-plus scored keyword opportunities in about thirty seconds. If you find a jackpot in there, that was the whole point.

---

*Michael W. Smith builds [JackpotKeywords](https://jackpotkeywords.web.app) and a small portfolio of Chrome extensions and indie tools. Based in Garland, Texas. Former patent analyst at the USPTO and three IP firms; current indie maker.*
