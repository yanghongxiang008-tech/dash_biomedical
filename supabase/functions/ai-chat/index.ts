import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract keywords from user message for better search
function extractKeywords(message: string): string[] {
  // Common Chinese stop words
  const stopWords = new Set([
    '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
    '自己', '这', '那', '什么', '怎么', '为什么', '吗', '呢', '吧', '啊', '嗯',
    '请', '帮', '帮我', '分析', '一下', '看看', '告诉', '介绍', '解释', '说说',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'about', 'like', 'through', 'after', 'over', 'between',
    'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among',
    'what', 'how', 'why', 'when', 'where', 'which', 'who', 'please', 'tell', 'me'
  ]);

  const keywords: string[] = [];
  
  // Extract English words (likely stock symbols, company names, technical terms)
  const englishMatches = message.match(/[A-Z]{2,5}(?:\s|$|,|\.)/g);
  if (englishMatches) {
    for (const match of englishMatches) {
      const word = match.trim().replace(/[,.]$/, '');
      if (word.length >= 2 && word.length <= 5) {
        keywords.push(word);
      }
    }
  }
  
  // Extract English words/phrases (company names, terms)
  const englishWords = message.match(/[A-Za-z]+(?:\s+[A-Za-z]+)*/g);
  if (englishWords) {
    for (const word of englishWords) {
      const trimmed = word.trim().toLowerCase();
      if (trimmed.length >= 3 && !stopWords.has(trimmed)) {
        keywords.push(word.trim());
      }
    }
  }
  
  // Extract Chinese keywords (split by common delimiters and filter stop words)
  const chineseText = message.replace(/[A-Za-z0-9\s.,!?;:'"()[\]{}]/g, ' ');
  const chineseSegments = chineseText.split(/[\s，。！？；：、""''（）【】]+/).filter(Boolean);
  
  for (const segment of chineseSegments) {
    if (segment.length >= 2 && segment.length <= 10 && !stopWords.has(segment)) {
      keywords.push(segment);
    }
  }
  
  // Also add the original message as a fallback (truncated)
  if (message.length <= 50) {
    keywords.push(message);
  }
  
  // Remove duplicates and limit
  const uniqueKeywords = [...new Set(keywords)];
  console.log('[Keywords] Extracted:', uniqueKeywords.slice(0, 5));
  return uniqueKeywords.slice(0, 5);
}

// Recursively get nested block content
async function getBlockContent(blockId: string, notionApiKey: string, depth: number = 0): Promise<string[]> {
  if (depth > 2) return []; // Limit recursion depth
  
  const textBlocks: string[] = [];
  
  try {
    const blocksResponse = await fetch(
      `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`,
      {
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
        },
      }
    );
    
    if (!blocksResponse.ok) return textBlocks;
    
    const blocksData = await blocksResponse.json();
    
    for (const block of blocksData.results || []) {
      const blockType = block.type;
      const blockContent = block[blockType];
      
      // Extract text from rich_text
      if (blockContent?.rich_text) {
        const text = blockContent.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) {
          // Add prefix for different block types
          const prefix = blockType === 'heading_1' ? '# ' :
                        blockType === 'heading_2' ? '## ' :
                        blockType === 'heading_3' ? '### ' :
                        blockType === 'bulleted_list_item' ? '• ' :
                        blockType === 'numbered_list_item' ? '- ' :
                        blockType === 'to_do' ? (blockContent.checked ? '☑ ' : '☐ ') :
                        blockType === 'quote' ? '> ' :
                        blockType === 'callout' ? '[Callout] ' : '';
          textBlocks.push(prefix + text);
        }
      }
      
      // Handle code blocks
      if (blockType === 'code' && blockContent?.rich_text) {
        const code = blockContent.rich_text.map((t: any) => t.plain_text).join('');
        if (code.trim()) {
          textBlocks.push(`\`\`\`${blockContent.language || ''}\n${code}\n\`\`\``);
        }
      }
      
      // Recursively get nested blocks (toggle, callout, etc.)
      if (block.has_children) {
        const nestedBlocks = await getBlockContent(block.id, notionApiKey, depth + 1);
        textBlocks.push(...nestedBlocks.map(b => '  ' + b)); // Indent nested content
      }
    }
  } catch (e) {
    console.error('[Notion] Failed to fetch nested blocks:', e);
  }
  
  return textBlocks;
}

// Enhanced Notion search with multiple keywords and deeper content retrieval
async function searchNotion(
  query: string, 
  notionApiKey: string
): Promise<{ results: string[]; sources: string[]; richContent: boolean }> {
  try {
    console.log('[Notion] Starting enhanced search for:', query);
    
    // Extract keywords for multi-search
    const keywords = extractKeywords(query);
    const allPageIds = new Set<string>();
    const pageDataMap = new Map<string, any>();
    
    // Search with multiple keywords
    const searchPromises = keywords.slice(0, 3).map(async (keyword) => {
      console.log('[Notion] Searching keyword:', keyword);
      
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          query: keyword,
          page_size: 20, // Increased from 10
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          }
        }),
      });

      if (!response.ok) {
        console.error('[Notion] Search failed for keyword:', keyword, response.status);
        return [];
      }

      const data = await response.json();
      return data.results || [];
    });
    
    const searchResults = await Promise.all(searchPromises);
    
    // Merge and deduplicate results
    for (const results of searchResults) {
      for (const item of results) {
        if (item.id && !allPageIds.has(item.id)) {
          allPageIds.add(item.id);
          pageDataMap.set(item.id, item);
        }
      }
    }
    
    console.log(`[Notion] Found ${pageDataMap.size} unique pages from ${keywords.length} keyword searches`);
    
    const results: string[] = [];
    const sources: string[] = [];
    
    // Process top pages with deeper content retrieval
    const topPages = Array.from(pageDataMap.values()).slice(0, 15); // Process top 15 pages
    
    for (const item of topPages) {
      let title = '';
      let content = '';
      
      // Extract title
      if (item.properties?.title?.title?.[0]?.plain_text) {
        title = item.properties.title.title[0].plain_text;
      } else if (item.properties?.Name?.title?.[0]?.plain_text) {
        title = item.properties.Name.title[0].plain_text;
      } else if (item.properties) {
        for (const [key, value] of Object.entries(item.properties)) {
          if ((value as any)?.title?.[0]?.plain_text) {
            title = (value as any).title[0].plain_text;
            break;
          }
        }
      }

      // Get deep page content with recursive block retrieval
      if (item.object === 'page' && item.id) {
        try {
          const textBlocks = await getBlockContent(item.id, notionApiKey, 0);
          content = textBlocks.join('\n').substring(0, 2500); // Increased from 1000 to 2500
        } catch (e) {
          console.error('[Notion] Failed to fetch page content:', e);
        }
      }

      if (title || content) {
        results.push(`### ${title || 'Untitled'}\n${content || 'No content'}`);
        sources.push(item.url || `notion://page/${item.id}`);
      }
    }

    const richContent = results.length >= 3 && results.join('').length > 1000;
    console.log(`[Notion] Final: ${results.length} results, rich content: ${richContent}`);
    
    return { results, sources, richContent };
  } catch (error) {
    console.error('[Notion] Search error:', error);
    return { results: [], sources: [], richContent: false };
  }
}

// Search web using Perplexity with dynamic token limit
async function searchWeb(
  query: string, 
  perplexityApiKey: string, 
  maxTokens: number = 500
): Promise<{ content: string; citations: string[] }> {
  try {
    console.log('[Perplexity] Searching for:', query, 'with max tokens:', maxTokens);
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'Provide concise, factual information with key data points. Focus on recent and relevant information. Include specific numbers, dates, and facts.' 
          },
          { role: 'user', content: query }
        ],
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      console.error('[Perplexity] Search failed:', response.status);
      return { content: '', citations: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log(`[Perplexity] Got response with ${citations.length} citations`);
    return { content, citations };
  } catch (error) {
    console.error('[Perplexity] Search error:', error);
    return { content: '', citations: [] };
  }
}

// Get user's Notion API key from their profile
async function getUserNotionKey(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('notion_api_key')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.log('[Auth] Could not get user profile:', error?.message);
      return null;
    }
    
    return data.notion_api_key || null;
  } catch (error) {
    console.error('[Auth] Error getting user Notion key:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    let userNotionKey: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data: { user } } = await userClient.auth.getUser();
      
      if (user) {
        console.log('[Auth] User authenticated:', user.id);
        userNotionKey = await getUserNotionKey(supabase, user.id);
        console.log('[Auth] User has Notion key:', !!userNotionKey);
      }
    }

    // Get the user's latest message for searching
    const userMessage = messages[messages.length - 1]?.content || '';
    console.log('[AI Chat] User message:', userMessage);

    // Get user ID for research sources query
    let userId: string | null = null;
    const authHeader2 = req.headers.get('Authorization');
    if (authHeader2) {
      const token = authHeader2.replace('Bearer ', '');
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    // Extract keywords for intelligent filtering
    const queryKeywords = extractKeywords(userMessage);
    console.log('[AI Chat] Query keywords:', queryKeywords);

    // Helper function to check if content matches keywords
    const matchesKeywords = (text: string, keywords: string[]): number => {
      if (!text || keywords.length === 0) return 0;
      const lowerText = text.toLowerCase();
      let score = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      return score;
    };

    // Fetch ALL database context (full data)
    const [
      stockGroupsResult,
      stocksResult,
      allDailyNotesResult,
      allStockNotesResult,
      allWeeklyNotesResult,
      researchSourcesResult,
      allResearchItemsResult
    ] = await Promise.all([
      supabase.from('stock_groups').select('*').order('display_order'),
      supabase.from('stocks').select('*').order('display_order'),
      // Full query - all daily notes
      supabase.from('daily_notes').select('*').order('date', { ascending: false }),
      // Full query - all stock notes
      supabase.from('stock_notes').select('*').order('date', { ascending: false }),
      // Full query - all weekly notes
      supabase.from('weekly_additional_notes').select('*').order('week_end_date', { ascending: false }),
      // Full query - all research sources
      userId ? supabase.from('research_sources').select('id, name, url, category, description, tags').eq('user_id', userId).order('priority', { ascending: true }) : Promise.resolve({ data: [] }),
      // Full query - all research items
      userId ? supabase.from('research_items').select('id, source_id, title, summary, content, url, published_at').order('published_at', { ascending: false }) : Promise.resolve({ data: [] })
    ]);

    // Build database context
    const stockGroups = stockGroupsResult.data || [];
    const stocks = stocksResult.data || [];
    const allDailyNotes = allDailyNotesResult.data || [];
    const allStockNotes = allStockNotesResult.data || [];
    const allWeeklyNotes = allWeeklyNotesResult.data || [];
    const researchSources = researchSourcesResult.data || [];
    const allResearchItems = allResearchItemsResult.data || [];

    console.log(`[DB] Full data: ${allDailyNotes.length} daily notes, ${allStockNotes.length} stock notes, ${allWeeklyNotes.length} weekly notes`);
    console.log(`[Research] Full data: ${researchSources.length} sources, ${allResearchItems.length} items`);

    const groupStocksMap: Record<string, string[]> = {};
    for (const group of stockGroups) {
      groupStocksMap[group.name] = stocks
        .filter(s => s.group_id === group.id)
        .map(s => s.symbol);
    }

    // Intelligent filtering: Score and sort daily notes by relevance
    const scoredDailyNotes = allDailyNotes.map(n => ({
      ...n,
      score: matchesKeywords(n.content || '', queryKeywords)
    })).sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Take top relevant notes + most recent ones
    const relevantDailyNotes = scoredDailyNotes.filter(n => n.score > 0).slice(0, 15);
    const recentDailyNotes = scoredDailyNotes.filter(n => n.score === 0).slice(0, 10);
    const selectedDailyNotes = [...relevantDailyNotes, ...recentDailyNotes].slice(0, 20);

    const formattedDailyNotes = selectedDailyNotes.map(n => 
      `[${n.date}]: ${n.content?.replace(/<[^>]*>/g, '').substring(0, 600) || 'No content'}`
    ).join('\n\n');

    // Intelligent filtering: Score and sort stock notes by relevance
    const scoredStockNotes = allStockNotes.map(n => ({
      ...n,
      score: matchesKeywords(`${n.symbol} ${n.note}`, queryKeywords)
    })).sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime());

    const relevantStockNotes = scoredStockNotes.filter(n => n.score > 0).slice(0, 40);
    const recentStockNotes = scoredStockNotes.filter(n => n.score === 0).slice(0, 20);
    const selectedStockNotes = [...relevantStockNotes, ...recentStockNotes].slice(0, 50);

    const formattedStockNotes = selectedStockNotes.map(n =>
      `[${n.date}] ${n.symbol}: ${n.note}`
    ).join('\n');

    // Intelligent filtering: Score and sort weekly notes by relevance
    const scoredWeeklyNotes = allWeeklyNotes.map(n => ({
      ...n,
      score: matchesKeywords(n.content || '', queryKeywords)
    })).sort((a, b) => b.score - a.score || new Date(b.week_end_date).getTime() - new Date(a.week_end_date).getTime());

    const relevantWeeklyNotes = scoredWeeklyNotes.filter(n => n.score > 0).slice(0, 10);
    const recentWeeklyNotes = scoredWeeklyNotes.filter(n => n.score === 0).slice(0, 5);
    const selectedWeeklyNotes = [...relevantWeeklyNotes, ...recentWeeklyNotes].slice(0, 12);

    const formattedWeeklyNotes = selectedWeeklyNotes.map(n =>
      `[Week ending ${n.week_end_date}]: ${n.content?.replace(/<[^>]*>/g, '').substring(0, 600) || 'No content'}`
    ).join('\n\n');

    // Build research sources context
    const sourceMap: Record<string, any> = {};
    for (const source of researchSources) {
      sourceMap[source.id] = source;
    }

    // Intelligent filtering: Score and sort research items by relevance
    const scoredResearchItems = allResearchItems.map(item => {
      const source = sourceMap[item.source_id];
      const searchText = `${source?.name || ''} ${item.title} ${item.summary || ''} ${item.content || ''} ${source?.tags?.join(' ') || ''}`;
      return {
        ...item,
        sourceName: source?.name || 'Unknown Source',
        score: matchesKeywords(searchText, queryKeywords)
      };
    }).sort((a, b) => b.score - a.score || new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());

    const relevantResearchItems = scoredResearchItems.filter(i => i.score > 0).slice(0, 25);
    const recentResearchItems = scoredResearchItems.filter(i => i.score === 0).slice(0, 10);
    const selectedResearchItems = [...relevantResearchItems, ...recentResearchItems].slice(0, 30);

    const formattedResearchItems = selectedResearchItems.map(item => {
      const content = item.content?.replace(/<[^>]*>/g, '').substring(0, 1000) || item.summary || '';
      return `### [${item.sourceName}] ${item.title}
Published: ${item.published_at || 'Unknown date'}
URL: ${item.url || 'N/A'}
${content}`;
    }).join('\n\n---\n\n');

    const formattedResearchSources = researchSources.map(s => 
      `- ${s.name} (${s.category}): ${s.description || s.url}${s.tags?.length ? ` [Tags: ${s.tags.join(', ')}]` : ''}`
    ).join('\n');

    console.log(`[Filtered] Selected: ${selectedDailyNotes.length} daily, ${selectedStockNotes.length} stock, ${selectedWeeklyNotes.length} weekly, ${selectedResearchItems.length} research items`);

    // Search Notion first if user has their own API key configured
    let notionContext = '';
    let notionSources: string[] = [];
    let hasRichNotionContent = false;
    
    if (userNotionKey) {
      console.log('[Notion] Using user-specific Notion key');
      const notionResults = await searchNotion(userMessage, userNotionKey);
      if (notionResults.results.length > 0) {
        notionContext = notionResults.results.join('\n\n---\n\n');
        notionSources = notionResults.sources;
        hasRichNotionContent = notionResults.richContent;
      }
    } else {
      console.log('[Notion] No user Notion key available');
    }

    // Search web with dynamic token limit based on Notion content richness
    let webContext = '';
    let webCitations: string[] = [];
    if (PERPLEXITY_API_KEY) {
      // If Notion has rich content, reduce web search weight; otherwise increase it
      const webMaxTokens = hasRichNotionContent ? 300 : 600;
      console.log(`[Web] Using max tokens: ${webMaxTokens} (Notion rich: ${hasRichNotionContent})`);
      
      const webResults = await searchWeb(userMessage, PERPLEXITY_API_KEY, webMaxTokens);
      if (webResults.content) {
        webContext = webResults.content;
        webCitations = webResults.citations;
      }
    }

    // Build comprehensive system prompt with source attribution
    const systemPrompt = `## AGENT IDENTITY

你是资深的行业专家和训练有素的high-finance investment analyst。有条不紊，以数据为导向，致力于深入分析。你重视准确性、逻辑推理和基于证据的决策。你系统地处理问题，深思熟虑。你相信更好的信息会带来更好的决策。

你使用简洁的表达方式，最大限度地提高信息密度。你写的段落简短，层次清晰。你主要使用主动语态。避免使用填充词或冗余短语。

## COMMUNICATION STYLE

- 通过有针对性的问题进行系统的信息收集
- 为组织讨论主题提供清晰的框架
- 对推理过程进行逐步解释
- 在提出建议之前进行全面总结
- 提供多种选择并对其进行利弊分析
- 直接回应核心诉求，每一个词都有其目的

## LANGUAGE PREFERENCE

语言平实，要有活人感，ai感弱。比如可以用：
- 适当的中英混合（industry terms可以保留英文）
- 口语化表达，不要太书面
- 偶尔用"嗯"、"hmm"、"其实"这类词
- 句子不用太完美，像是在跟同事聊天

## SOURCE ATTRIBUTION (CRITICAL - 必须严格遵守):
当引用来源时，不要直接写[DB]、[NOTION]、[WEB]、[RESEARCH]这些文字标签！系统会自动把它们转成icons。
所以你只需要在引用信息时，在句子开头加上对应的source tag即可，系统会自动显示成icon。
- 用户数据库内容 → 开头写 [DB]
- Notion笔记内容 → 开头写 [NOTION]
- Research Hub内容 → 开头写 [RESEARCH]
- Web搜索内容 → 开头写 [WEB]
- 你自己的分析/推理 → 不需要加任何tag

## SOURCE PRIORITY (CRITICAL - 来源优先级):

**⚠️ Notion内容是用户自己积累的研究笔记和知识库，具有最高的权威性和相关性！**

回答问题时的优先级顺序：
1. **NOTION (最高优先级)** - 用户的个人研究笔记，包含深度分析和独特见解
   - 如果Notion中有相关内容，必须首先检查并引用
   - Notion的内容代表了用户的思考框架和分析逻辑
   - 引用时要体现用户笔记中的核心观点和洞察

2. **RESEARCH (高优先级)** - 用户订阅的研究资料和行业信息源
   - 包含用户关注的行业报告、研究文章、新闻源等
   - 这些是用户主动筛选的高质量信息来源
   - 引用时注明来源名称，帮助用户追溯原文
   
3. **DATABASE (次高优先级)** - 用户追踪的股票数据和记录的笔记
   - 用于获取用户关注的股票列表和历史价格
   - 查看用户记录的daily notes和stock notes
   
4. **WEB (补充信息)** - 用于获取最新新闻和实时数据
   - 作为补充信息来源，验证或更新其他来源的数据
   - 获取最新的市场新闻和价格变动

**重要：优先使用Notion和Research Hub中的内容，WEB搜索作为补充！**

## KNOWLEDGE SOURCES:

${notionContext ? `### NOTION - 用户的Research Notes (⚠️ 最高优先级，必须优先检查和引用!):

这是用户精心整理的研究笔记和知识库，代表了用户的深度思考和分析框架。
如果以下内容与用户的问题相关，必须优先引用这些信息！

${notionContext}

Notion Sources: ${notionSources.join(', ')}

` : '### NOTION: 用户未连接Notion或未找到相关内容\n\n'}${formattedResearchItems ? `### RESEARCH - 用户订阅的研究资料 (⚠️ 高优先级):

用户订阅的研究来源:
${formattedResearchSources || 'No sources configured'}

最新研究内容:
${formattedResearchItems}

` : '### RESEARCH: 用户未配置研究资料来源\n\n'}### DATABASE - 用户的Stock Tracking Data:

Tracked Stock Groups:
${Object.entries(groupStocksMap).map(([group, symbols]) => `${group}: ${symbols.join(', ')}`).join('\n')}

Daily Market Notes (智能筛选 - 与查询相关的笔记优先):
${formattedDailyNotes || 'No daily notes'}

Individual Stock Notes (智能筛选 - 与查询相关的笔记优先):
${formattedStockNotes || 'No stock notes'}

Weekly Summary Notes (智能筛选 - 与查询相关的笔记优先):
${formattedWeeklyNotes || 'No weekly notes'}

${webContext ? `### WEB - Real-time Search Results (补充信息):
${webContext}

Web Citations: ${webCitations.join(', ')}` : ''}`;

    // Convert messages to Gemini format
    const geminiContents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add system prompt as the first user message with context
    geminiContents.unshift({
      role: 'user',
      parts: [{ text: `System instructions:\n${systemPrompt}\n\nNow respond to the conversation.` }]
    });
    geminiContents.splice(1, 0, {
      role: 'model',
      parts: [{ text: '明白了，我会按照这个framework来分析和回应。Notion内容会是我的首要参考来源。' }]
    });

    // Use Gemini 3 Pro model
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            temperature: 1,
            maxOutputTokens: 16384,
            thinkingConfig: {
              includeThoughts: true,
              thinkingBudget: 8192,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Gemini API error: " + errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE to OpenAI-compatible SSE format with thinking support
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const parts = data.candidates?.[0]?.content?.parts || [];
              
              console.log('[Gemini] Received parts:', JSON.stringify(parts.map((p: any) => ({ 
                hasThought: !!p.thought, 
                hasText: !!p.text,
                textPreview: p.text?.substring(0, 50)
              }))));
              
              for (const part of parts) {
                if (part.thought === true && part.text) {
                  console.log('[Gemini] Thinking chunk:', part.text.substring(0, 100));
                  const openaiFormat = {
                    choices: [{
                      delta: { 
                        content: part.text,
                        thinking: true 
                      }
                    }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                } else if (part.text && !part.thought) {
                  const openaiFormat = {
                    choices: [{
                      delta: { content: part.text }
                    }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                }
              }
            } catch (e) {
              console.log('[Gemini] Parse error for line:', line.substring(0, 100));
            }
          }
        }
      },
      flush(controller) {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
