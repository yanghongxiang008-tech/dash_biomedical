import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check if URL is an xcancel Twitter RSS feed and convert to RSSHub format
function getAlternativeFeedUrl(feedUrl: string): string | null {
  // Match xcancel Twitter RSS: https://rss.xcancel.com/USERNAME/rss
  const xancelMatch = feedUrl.match(/rss\.xcancel\.com\/([^\/]+)\/rss/i);
  if (xancelMatch) {
    const username = xancelMatch[1];
    // Use RSSHub as alternative (you can self-host or use public instances)
    return `https://rsshub.app/twitter/user/${username}`;
  }
  return null;
}

const normalizeEncoding = (value: string | null | undefined) => {
  if (!value) return 'utf-8';
  const cleaned = value.replace(/['"]/g, '').trim().toLowerCase();
  if (cleaned === 'utf8') return 'utf-8';
  if (cleaned === 'gb2312' || cleaned === 'gbk') return 'gb18030';
  return cleaned;
};

const detectXmlEncoding = (snippet: string) => {
  const match = snippet.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
  return match?.[1] || null;
};

type FeedCache = {
  hash: string | null;
  etag: string | null;
  lastModified: string | null;
  feedUrl: string | null;
};

const toHex = (buffer: ArrayBuffer) => {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const hashString = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(digest);
};

const parseFeedCache = (value: string | null): FeedCache => {
  if (!value) {
    return { hash: null, etag: null, lastModified: null, feedUrl: null };
  }

  const trimmed = value.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<FeedCache>;
      return {
        hash: parsed.hash ?? null,
        etag: parsed.etag ?? null,
        lastModified: parsed.lastModified ?? null,
        feedUrl: parsed.feedUrl ?? null,
      };
    } catch {
      return { hash: value, etag: null, lastModified: null, feedUrl: null };
    }
  }

  return { hash: value, etag: null, lastModified: null, feedUrl: null };
};

const normalizeFeedCacheForUrl = (cache: FeedCache, feedUrl: string): FeedCache => {
  if (cache.feedUrl && cache.feedUrl !== feedUrl) {
    return { hash: null, etag: null, lastModified: null, feedUrl: null };
  }
  return cache;
};

const buildFeedCache = (cache: FeedCache) => {
  return JSON.stringify(cache);
};

const readTextWithEncoding = async (response: Response) => {
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || '';
  const headerCharset = contentType.match(/charset=([^;]+)/i)?.[1] || null;
  const asciiPreview = new TextDecoder('utf-8').decode(buffer.slice(0, 2048));
  const xmlCharset = detectXmlEncoding(asciiPreview);
  const encoding = normalizeEncoding(xmlCharset || headerCharset || 'utf-8');

  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch (error) {
    console.warn(`Unsupported encoding "${encoding}", falling back to utf-8`, error);
    return new TextDecoder('utf-8').decode(buffer);
  }
};

// Simple RSS parser
async function parseRSS(
  feedUrl: string,
  previousCache: FeedCache,
  isRetry = false
): Promise<{
  items: Array<{
    title: string;
    url: string;
    summary: string;
    content: string;
    published_at: string;
  }>;
  contentHash: string | null;
  notModified: boolean;
  etag: string | null;
  lastModified: string | null;
}> {
  try {
    // Use a common RSS reader User-Agent to avoid being blocked by some services
    const cacheForUrl = normalizeFeedCacheForUrl(previousCache, feedUrl);
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    };

    if (cacheForUrl.etag) {
      headers['If-None-Match'] = cacheForUrl.etag;
    }
    if (cacheForUrl.lastModified) {
      headers['If-Modified-Since'] = cacheForUrl.lastModified;
    }

    const response = await fetch(feedUrl, {
      headers
    });
    
    if (response.status === 304) {
      return { 
        items: [], 
        contentHash: cacheForUrl.hash, 
        notModified: true, 
        etag: cacheForUrl.etag, 
        lastModified: cacheForUrl.lastModified 
      };
    }

    if (!response.ok) {
      console.error(`Failed to fetch RSS: ${response.status}`);
      // Try alternative feed URL if available
      if (!isRetry) {
        const altUrl = getAlternativeFeedUrl(feedUrl);
        if (altUrl) {
          console.log(`Trying alternative feed URL: ${altUrl}`);
          return parseRSS(altUrl, previousCache, true);
        }
      }
      return { items: [], contentHash: null, notModified: false, etag: null, lastModified: null };
    }

    const text = await readTextWithEncoding(response);
    const responseEtag = response.headers.get('etag');
    const responseLastModified = response.headers.get('last-modified');
    
    // Check for xcancel whitelist error
    if (text.includes('RSS reader not yet whitelisted') || text.includes('not yet whitelist')) {
      console.log('xcancel whitelist error detected, trying alternative...');
      if (!isRetry) {
        const altUrl = getAlternativeFeedUrl(feedUrl);
        if (altUrl) {
          console.log(`Trying alternative feed URL: ${altUrl}`);
          return parseRSS(altUrl, previousCache, true);
        }
      }
      // Return empty if no alternative available
      return { items: [], contentHash: null, notModified: false, etag: null, lastModified: null };
    }

    const contentHash = await hashString(text);
    if (cacheForUrl.hash && contentHash === cacheForUrl.hash) {
      return { 
        items: [], 
        contentHash, 
        notModified: true, 
        etag: responseEtag ?? null, 
        lastModified: responseLastModified ?? null 
      };
    }

    const items: Array<{
      title: string;
      url: string;
      summary: string;
      content: string;
      published_at: string;
    }> = [];

    // Helper to strip HTML tags and decode entities
    const stripHtml = (html: string) => {
      return html
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
          try {
            return String.fromCodePoint(parseInt(hex, 16));
          } catch {
            return '';
          }
        })
        .replace(/&#(\d+);/g, (_, num) => {
          try {
            return String.fromCodePoint(parseInt(num, 10));
          } catch {
            return '';
          }
        })
        .trim();
    };

    // Parse RSS/Atom items using regex (simple approach)
    const isAtom = text.includes('<feed') && text.includes('xmlns="http://www.w3.org/2005/Atom"');
    
    if (isAtom) {
      // Atom format
      const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
      let match;
      while ((match = entryRegex.exec(text)) !== null) {
        const entry = match[1];
        const title = entry.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
        const link = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>|<link[^>]*>([^<]+)<\/link>/i)?.[1] || 
                     entry.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1] || '';
        const summaryRaw = entry.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1]?.trim() || '';
        const contentRaw = entry.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1]?.trim() || '';
        const published = entry.match(/<published[^>]*>([^<]+)<\/published>/i)?.[1] ||
                          entry.match(/<updated[^>]*>([^<]+)<\/updated>/i)?.[1] || new Date().toISOString();

        if (title) {
          const fullContent = stripHtml(contentRaw || summaryRaw);
          items.push({
            title: stripHtml(title),
            url: link,
            summary: fullContent.substring(0, 500),
            content: fullContent,
            published_at: new Date(published).toISOString()
          });
        }
      }
    } else {
      // RSS format
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(text)) !== null) {
        const item = match[1];
        const title = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
        const link = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || 
                     item.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/i)?.[1]?.trim() || '';
        const descriptionRaw = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() || '';
        // Try to get full content from content:encoded (common in RSS)
        const contentEncodedRaw = item.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i)?.[1]?.trim() || '';
        const pubDate = item.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i)?.[1] || new Date().toISOString();

        if (title) {
          const fullContent = stripHtml(contentEncodedRaw || descriptionRaw);
          items.push({
            title: stripHtml(title),
            url: link,
            summary: stripHtml(descriptionRaw).substring(0, 500),
            content: fullContent,
            published_at: new Date(pubDate).toISOString()
          });
        }
      }
    }

    // Filter out error messages that might appear as articles
    const filteredItems = items.filter(item => {
      const lowerTitle = item.title.toLowerCase();
      const lowerContent = (item.content || item.summary || '').toLowerCase();
      // Skip items that look like error messages
      if (lowerTitle.includes('not yet whitelisted') || 
          lowerTitle.includes('whitelist') ||
          lowerContent.includes('not yet whitelisted') ||
          lowerContent.includes('please send an email')) {
        return false;
      }
      return true;
    });

    return { 
      items: filteredItems, 
      contentHash, 
      notModified: false, 
      etag: responseEtag ?? null, 
      lastModified: responseLastModified ?? null 
    };
  } catch (error) {
    console.error('Error parsing RSS:', error);
    return { items: [], contentHash: null, notModified: false, etag: null, lastModified: null };
  }
}

// Auto-detect RSS feed URL from a website
async function discoverFeedUrl(websiteUrl: string): Promise<string | null> {
  try {
    // Common RSS feed paths
    const commonPaths = [
      '/feed',
      '/feed.xml',
      '/rss',
      '/rss.xml',
      '/atom.xml',
      '/feed/atom',
      '/blog/feed',
      '/blog/rss.xml'
    ];

    const baseUrl = new URL(websiteUrl);
    
    // Try common paths
    for (const path of commonPaths) {
      try {
        const feedUrl = `${baseUrl.origin}${path}`;
        const response = await fetch(feedUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)' }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
            return feedUrl;
          }
        }
      } catch {
        continue;
      }
    }

    // Try to find feed link in HTML
    const response = await fetch(websiteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)' }
    });
    
    if (response.ok) {
      const html = await response.text();
      const feedMatch = html.match(/<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i);
      if (feedMatch) {
        const feedUrl = feedMatch[2];
        if (feedUrl.startsWith('http')) {
          return feedUrl;
        }
        return new URL(feedUrl, baseUrl.origin).toString();
      }
    }

    return null;
  } catch (error) {
    console.error('Error discovering feed:', error);
    return null;
  }
}

// Crawl a news/article website using Firecrawl with intelligent extraction
async function crawlWebsite(url: string, _previousHash: string | null): Promise<{
  items: Array<{ 
    title: string; 
    url: string; 
    summary: string;
    content: string;
    published_at: string;
  }>;
}> {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  
  if (!firecrawlKey) {
    console.log('Firecrawl API key not configured, skipping crawl');
    return { items: [] };
  }

  console.log(`Crawling website: ${url}`);

  try {
    // First, try to extract structured article list using LLM extraction
    const extractResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        formats: ['extract', 'markdown', 'links'],
        onlyMainContent: true,
        extract: {
          schema: {
            type: 'object',
            properties: {
              articles: {
                type: 'array',
                description: 'List of news articles or blog posts found on the page',
                items: {
                  type: 'object',
                  properties: {
                    title: { 
                      type: 'string', 
                      description: 'The headline or title of the article' 
                    },
                    url: { 
                      type: 'string', 
                      description: 'The full URL link to the article. Must be absolute URL starting with http' 
                    },
                    summary: { 
                      type: 'string', 
                      description: 'Brief summary, excerpt or description of the article (1-3 sentences)' 
                    },
                    date: { 
                      type: 'string', 
                      description: 'Publication date in any format (e.g., "2024-01-15", "Jan 15, 2024", "2 days ago")' 
                    }
                  },
                  required: ['title', 'url']
                }
              }
            },
            required: ['articles']
          },
          prompt: `Extract all news articles, blog posts, or content items from this page. 
For each article, find:
- The title/headline
- The URL (must be a complete absolute URL, not relative)
- A summary or excerpt if available
- The publication date if shown

Only extract actual content items, not navigation links, ads, or site sections.
If URLs are relative, convert them to absolute URLs using the page's base URL.`
        }
      })
    });

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      console.error('Firecrawl extract error:', errorText);
      // Fall back to link extraction
      return await extractFromLinks(url, firecrawlKey);
    }

    const data = await extractResponse.json();
    console.log('Firecrawl response:', JSON.stringify(data, null, 2).substring(0, 1000));
    
    const extractedArticles = data.data?.extract?.articles || [];
    const baseUrl = new URL(url);
    
    if (extractedArticles.length > 0) {
      console.log(`Extracted ${extractedArticles.length} articles via LLM`);
      
      const items = extractedArticles
        .filter((a: any) => a.title && a.url)
        .map((a: any) => {
          // Ensure URL is absolute
          let articleUrl = a.url;
          if (!articleUrl.startsWith('http')) {
            try {
              articleUrl = new URL(a.url, baseUrl.origin).toString();
            } catch {
              articleUrl = `${baseUrl.origin}${a.url.startsWith('/') ? '' : '/'}${a.url}`;
            }
          }
          
          // Parse date
          let publishedAt = new Date().toISOString();
          if (a.date) {
            try {
              const parsed = new Date(a.date);
              if (!isNaN(parsed.getTime())) {
                publishedAt = parsed.toISOString();
              }
            } catch {
              // Keep default
            }
          }
          
          return {
            title: a.title.substring(0, 500),
            url: articleUrl,
            summary: (a.summary || '').substring(0, 1000),
            content: a.summary || '',
            published_at: publishedAt
          };
        })
        // Filter out invalid URLs and duplicates
        .filter((item: any, index: number, self: any[]) => 
          item.url.startsWith('http') && 
          self.findIndex(i => i.url === item.url) === index
        );
      
      return { items };
    }

    // If LLM extraction didn't find articles, try link-based extraction
    console.log('LLM extraction found no articles, trying link extraction...');
    return await extractFromLinks(url, firecrawlKey, data);
    
  } catch (error) {
    console.error('Error crawling website:', error);
    return { items: [] };
  }
}

// Fallback: Extract articles from page links
async function extractFromLinks(
  url: string, 
  firecrawlKey: string,
  existingData?: any
): Promise<{
  items: Array<{ 
    title: string; 
    url: string; 
    summary: string;
    content: string;
    published_at: string;
  }>;
}> {
  try {
    let data = existingData;
    
    // Fetch page if we don't have data
    if (!data) {
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'links'],
          onlyMainContent: true
        })
      });

      if (!response.ok) {
        console.error('Firecrawl error:', await response.text());
        return { items: [] };
      }

      data = await response.json();
    }

    const links = data.data?.links || [];
    const markdown = data.data?.markdown || '';
    const baseUrl = new URL(url);
    
    console.log(`Found ${links.length} links on page`);

    // Filter links that look like article URLs
    const articlePatterns = [
      /\/\d{4}\/\d{2}\//, // Date patterns like /2024/01/
      /\/article\//i,
      /\/post\//i,
      /\/blog\//i,
      /\/news\//i,
      /\/story\//i,
      /\/p\/[a-z0-9-]+$/i, // Medium-style
      /-\d+\.html$/i, // ID-based articles
      /\/[a-z0-9-]+-[a-z0-9-]+$/i, // Slug-based URLs
    ];
    
    // Extract text snippets from markdown for summaries
    const markdownLines = markdown.split('\n').filter((l: string) => l.trim());
    
    const articleLinks = links
      .filter((link: string) => {
        // Must be same domain or subdomain
        try {
          const linkUrl = new URL(link, baseUrl.origin);
          const isSameDomain = linkUrl.hostname === baseUrl.hostname || 
                               linkUrl.hostname.endsWith('.' + baseUrl.hostname);
          if (!isSameDomain) return false;
          
          // Check if URL matches article patterns
          return articlePatterns.some(pattern => pattern.test(link));
        } catch {
          return false;
        }
      })
      .slice(0, 20); // Limit to 20 articles
    
    console.log(`Filtered to ${articleLinks.length} article-like links`);

    const items = articleLinks.map((link: string) => {
      // Try to find title from markdown (look for link text)
      const linkUrl = new URL(link, baseUrl.origin).toString();
      const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'i');
      const match = markdown.match(linkPattern);
      
      // Extract title from URL slug if not found
      let title = match?.[1] || '';
      if (!title) {
        const urlPath = new URL(linkUrl).pathname;
        const slug = urlPath.split('/').pop() || '';
        title = slug
          .replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, '') // Remove extension
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
          .substring(0, 200);
      }
      
      if (!title || title.length < 3) {
        title = 'Article';
      }

      return {
        title,
        url: linkUrl,
        summary: '',
        content: '',
        published_at: new Date().toISOString()
      };
    }).filter((item: any) => item.title.length >= 3);

    return { items };
    
  } catch (error) {
    console.error('Error in link extraction:', error);
    return { items: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to identify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const sourceIds = body.sourceIds as string[] | undefined;

    // Fetch sources to sync
    let query = supabase
      .from('research_sources')
      .select('*')
      .eq('user_id', user.id)
      .neq('source_type', 'manual');

    if (sourceIds && sourceIds.length > 0) {
      query = query.in('id', sourceIds);
    }

    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) {
      throw sourcesError;
    }

    let checkedCount = 0;
    let newItemsCount = 0;

    for (const source of sources || []) {
      checkedCount++;
      console.log(`Processing source: ${source.name} (${source.source_type})`);
      let nextContentCache: string | null = null;

      if (source.source_type === 'rss') {
        // Handle RSS sources
        let feedUrl = source.feed_url;
        
        if (!feedUrl) {
          // Try to discover feed URL
          feedUrl = await discoverFeedUrl(source.url);
          if (feedUrl) {
            await supabase
              .from('research_sources')
              .update({ feed_url: feedUrl })
              .eq('id', source.id);
          }
        }

        if (feedUrl) {
          const previousCache = parseFeedCache(source.last_content_hash);
          const { items, contentHash, notModified, etag, lastModified } = await parseRSS(
            feedUrl,
            previousCache
          );
          const hasCacheData = Boolean(contentHash || etag || lastModified);

          if (hasCacheData) {
            nextContentCache = buildFeedCache({
              hash: contentHash,
              etag,
              lastModified,
              feedUrl
            });
          }

          if (notModified) {
            console.log(`Feed unchanged for ${source.name}, skipping item checks`);
          } else {
            for (const item of items) {
              // Check if item already exists
              const { data: existing } = await supabase
                .from('research_items')
                .select('id')
                .eq('source_id', source.id)
                .eq('url', item.url)
                .single();

              if (!existing) {
                await supabase
                  .from('research_items')
                  .insert({
                    source_id: source.id,
                    title: item.title,
                    url: item.url,
                    summary: item.summary,
                    content: item.content,
                    published_at: item.published_at,
                    is_read: false
                  });
                newItemsCount++;
              }
            }
          }
        }
      } else if (source.source_type === 'crawl') {
        // Handle crawl sources - extract articles from news/blog pages
        const result = await crawlWebsite(source.url, source.last_content_hash);
        
        console.log(`Crawl found ${result.items.length} articles for ${source.name}`);
        
        for (const item of result.items) {
          // Check if item already exists (deduplicate by URL)
          const { data: existing } = await supabase
            .from('research_items')
            .select('id')
            .eq('source_id', source.id)
            .eq('url', item.url)
            .single();

          if (!existing) {
            await supabase
              .from('research_items')
              .insert({
                source_id: source.id,
                title: item.title,
                url: item.url,
                summary: item.summary,
                content: item.content,
                published_at: item.published_at,
                is_read: false
              });
            newItemsCount++;
            console.log(`Added new article: ${item.title.substring(0, 50)}...`);
          }
        }
      }

      // Update last checked time
      await supabase
        .from('research_sources')
        .update({
          last_checked_at: new Date().toISOString(),
          ...(nextContentCache ? { last_content_hash: nextContentCache } : {})
        })
        .eq('id', source.id);
    }

    console.log(`Sync complete: checked ${checkedCount} sources, found ${newItemsCount} new items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: checkedCount, 
        newItems: newItemsCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in sync-research-sources:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
