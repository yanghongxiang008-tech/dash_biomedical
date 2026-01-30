const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MAX_ITEMS = 160;
const MAX_ITEMS_CAP = 200;
const MAX_CONTENT_CHARS = 1200;
const MAX_TITLE_CHARS = 200;
const HISTORY_TITLE_MAX = 120;
const HISTORY_PREVIEW_MAX = 240;
// DEMO SHARE: temporary shared research owner (revert later).
const SHARED_OWNER_EMAIL = 'zezhou.t@foxmail.com';

const priorityCap = (priority: number) => {
  if (priority >= 5) return 12;
  if (priority === 4) return 10;
  if (priority === 3) return 8;
  if (priority === 2) return 6;
  return 4;
};

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripMarkdown = (value: string) => {
  return value
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const deriveHistoryTitle = (summaryText: string) => {
  const lines = summaryText.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return 'Research Summary';
  const first = stripMarkdown(lines[0]).replace(/^#+\s*/, '');
  if (!first) return 'Research Summary';
  return first.length > HISTORY_TITLE_MAX ? `${first.slice(0, HISTORY_TITLE_MAX)}...` : first;
};

const deriveHistoryPreview = (summaryText: string) => {
  const clean = stripMarkdown(summaryText);
  if (!clean) return '';
  return clean.length > HISTORY_PREVIEW_MAX ? `${clean.slice(0, HISTORY_PREVIEW_MAX)}...` : clean;
};

const normalizeText = (value: string, maxChars: number) => {
  if (!value) return '';
  const cleaned = stripHtml(value);
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}...`;
};

const parseCountFromRange = (value: string | null) => {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length !== 2) return null;
  const total = Number(parts[1]);
  return Number.isNaN(total) ? null : total;
};

const formatHistoryDate = (value?: string | null) => {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: authHeader,
      },
    });
    if (!authResponse.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authData = await authResponse.json();
    const requestUserId = authData?.id as string | undefined;
    if (!requestUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sharedOwnerResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/shared_research_owner_id`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    let sharedOwnerId: string | null = null;
    if (sharedOwnerResponse.ok) {
      const sharedOwnerData = await sharedOwnerResponse.json();
      sharedOwnerId = typeof sharedOwnerData === 'string' ? sharedOwnerData : null;
    } else {
      console.error('Failed to resolve shared owner id:', await sharedOwnerResponse.text());
    }

    const isSharedOwner = sharedOwnerId !== null && requestUserId === sharedOwnerId;
    const targetUserId = sharedOwnerId ?? requestUserId;

    const body = await req.json().catch(() => ({}));
    const sourceIds = Array.isArray(body.sourceIds) ? body.sourceIds : undefined;
    const markAsRead = Boolean(body.markAsRead);
    const maxItems =
      typeof body.maxItems === 'number'
        ? Math.max(10, Math.min(MAX_ITEMS_CAP, body.maxItems))
        : DEFAULT_MAX_ITEMS;

    const sourcesParams = new URLSearchParams();
    sourcesParams.set('select', 'id,name,priority,category,tags');
    sourcesParams.set('user_id', `eq.${targetUserId}`);
    if (sourceIds && sourceIds.length > 0) {
      sourcesParams.set('id', `in.(${sourceIds.join(',')})`);
    }

    const sourcesResponse = await fetch(
      `${supabaseUrl}/rest/v1/research_sources?${sourcesParams.toString()}`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );
    if (!sourcesResponse.ok) {
      throw new Error(await sourcesResponse.text());
    }
    const sources = (await sourcesResponse.json()) as Array<{
      id: string;
      name: string;
      priority: number | null;
      category: string;
      tags: string[] | null;
    }>;

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({
          summary: 'No research sources found for this user.',
          metadata: { itemCount: 0, sourceCount: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourceIdList = sources.map((source) => source.id);

    const countParams = new URLSearchParams();
    countParams.set('select', 'id');
    countParams.set('source_id', `in.(${sourceIdList.join(',')})`);
    countParams.set('is_read', 'eq.false');
    countParams.set('limit', '1');
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/research_items?${countParams.toString()}`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          Prefer: 'count=exact',
        },
      }
    );
    if (!countResponse.ok) {
      console.error('Failed to count unread items:', await countResponse.text());
    }
    const unreadItemCount = parseCountFromRange(countResponse.headers.get('content-range'));

    const itemsParams = new URLSearchParams();
    itemsParams.set('select', 'id,source_id,title,summary,content,url,published_at,is_read');
    itemsParams.set('source_id', `in.(${sourceIdList.join(',')})`);
    itemsParams.set('is_read', 'eq.false');
    itemsParams.set('order', 'published_at.desc');
    itemsParams.set('limit', '500');
    const itemsResponse = await fetch(
      `${supabaseUrl}/rest/v1/research_items?${itemsParams.toString()}`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );
    if (!itemsResponse.ok) {
      throw new Error(await itemsResponse.text());
    }
    const items = (await itemsResponse.json()) as Array<{
      id: string;
      source_id: string;
      title: string;
      summary: string | null;
      content: string | null;
      url: string | null;
      published_at: string | null;
      is_read: boolean;
    }>;

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({
          summary: 'No unread research items found.',
          metadata: { itemCount: 0, sourceCount: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const historyParams = new URLSearchParams();
    historyParams.set('select', 'summary,title,preview,created_at');
    historyParams.set('user_id', `eq.${targetUserId}`);
    historyParams.set('order', 'created_at.desc');
    historyParams.set('limit', '5');
    const historyResponse = await fetch(
      `${supabaseUrl}/rest/v1/research_summary_history?${historyParams.toString()}`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );
    let history: Array<{ summary: string; title: string | null; preview: string | null; created_at: string | null }> = [];
    if (historyResponse.ok) {
      history = (await historyResponse.json()) as typeof history;
    } else {
      console.error('Failed to load summary history:', await historyResponse.text());
    }

    const totalUnreadCount =
      typeof unreadItemCount === 'number' ? unreadItemCount : items.length;

    const sourceMap = new Map(
      sources.map((source) => [
        source.id,
        {
          name: source.name,
          priority: Math.min(Math.max(source.priority ?? 3, 1), 5),
        },
      ])
    );

    const unreadItems = items
      .map((item) => {
        const source = sourceMap.get(item.source_id);
        if (!source) return null;
        let publishedAt = '';
        if (item.published_at) {
          const parsed = new Date(item.published_at);
          publishedAt = Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
        }
        const contentCandidate = item.content || item.summary || '';
        return {
          id: item.id,
          sourceId: item.source_id,
          sourceName: source.name,
          sourcePriority: source.priority,
          title: normalizeText(item.title || 'Untitled', MAX_TITLE_CHARS),
          url: item.url || '',
          publishedAt,
          snippet: normalizeText(contentCandidate, MAX_CONTENT_CHARS),
        };
      })
      .filter((item) => item !== null) as Array<{
      id: string;
      sourceId: string;
      sourceName: string;
      sourcePriority: number;
      title: string;
      url: string;
      publishedAt: string;
      snippet: string;
    }>;

    const priorityCounts: Record<number, number> = {};
    unreadItems.forEach((item) => {
      priorityCounts[item.sourcePriority] =
        (priorityCounts[item.sourcePriority] || 0) + 1;
    });

    const sortedItems = [...unreadItems].sort((a, b) => {
      if (b.sourcePriority !== a.sourcePriority) {
        return b.sourcePriority - a.sourcePriority;
      }
      if (a.publishedAt && b.publishedAt) {
        return b.publishedAt.localeCompare(a.publishedAt);
      }
      return 0;
    });

    const perSourceUsage = new Map<string, number>();
    const selectedItems: typeof sortedItems = [];

    for (const item of sortedItems) {
      const cap = priorityCap(item.sourcePriority);
      const used = perSourceUsage.get(item.sourceId) || 0;
      if (used >= cap) continue;
      selectedItems.push(item);
      perSourceUsage.set(item.sourceId, used + 1);
      if (selectedItems.length >= maxItems) break;
    }

    const unreadSourceCount = new Set(unreadItems.map((item) => item.sourceId)).size;

    const prioritySummary = [5, 4, 3, 2, 1]
      .map((level) => `P${level}=${priorityCounts[level] || 0}`)
      .join(', ');

    const itemLines = selectedItems
      .map((item, index) => {
        return [
          `[${index + 1}] ${item.sourceName} | P${item.sourcePriority} | ${item.publishedAt || 'unknown date'}`,
          `Title: ${item.title}`,
          item.snippet ? `Snippet: ${item.snippet}` : 'Snippet: (none)',
          item.url ? `URL: ${item.url}` : 'URL: (none)',
        ].join('\n');
      })
      .join('\n\n');

    const sourceCatalog = sources
      .map((source) => `${source.name} | P${Math.min(Math.max(source.priority ?? 3, 1), 5)}`)
      .join('\n');

    const historyContext = (history || []).map((entry, index) => {
      const title = entry.title || 'Research Summary';
      const preview = entry.preview || deriveHistoryPreview(entry.summary || '');
      const date = formatHistoryDate(entry.created_at);
      return `${index + 1}) ${date} | ${title} | ${preview || '(no preview)'}`;
    }).join('\n') || 'None available.';

    const restHeaders = {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    };

    const insertSummaryHistory = async (summaryText: string) => {
      if (!summaryText || !isSharedOwner) return;
      const historyTitle = deriveHistoryTitle(summaryText);
      const historyPreview = deriveHistoryPreview(summaryText);
      const unreadSourceIds = [...new Set(unreadItems.map((item) => item.sourceId))];
      const response = await fetch(`${supabaseUrl}/rest/v1/research_summary_history`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify({
          user_id: targetUserId,
          summary: summaryText,
          title: historyTitle,
          preview: historyPreview,
          item_count: totalUnreadCount,
          source_count: unreadSourceCount,
          source_ids: unreadSourceIds,
          priority_counts: priorityCounts,
        }),
      });
      if (!response.ok) {
        console.error('Failed to store summary history:', await response.text());
      }
    };

    const markUnreadAsRead = async () => {
      if (!markAsRead || !isSharedOwner) return;
      const ids = unreadItems.map((item) => item.id);
      if (ids.length === 0) return;
      const params = new URLSearchParams();
      params.set('id', `in.(${ids.join(',')})`);
      const response = await fetch(
        `${supabaseUrl}/rest/v1/research_items?${params.toString()}`,
        {
          method: 'PATCH',
          headers: restHeaders,
          body: JSON.stringify({ is_read: true }),
        }
      );
      if (!response.ok) {
        console.error('Failed to mark items as read:', await response.text());
      }
    };

    const prompt = `
你是资深的行业专家与高端投研分析师（high‑finance investment analyst），覆盖多资产与多行业，有严谨训练和实战经验。风格：有条不紊、数据导向、重视准确性与逻辑推理，基于证据决策。表达：信息密度高但完整，段落短、层次清晰、主动语态为主，少用填充词或冗余短语。
互动方式：会提出有针对性的问题以补足信息；先搭框架，再逐步解释推理过程；在给建议前先做全面小结；提供多种选项并简述利弊；直接回应核心诉求。
请在内部先选择一位与主题最匹配的顶尖领域专家视角来思考（不要在输出中点名或自述），以确保分析更专业、更贴合主题。
语言偏好：平实、有活人感、AI感弱，可少量中英混合，允许轻微不完美的书面表达，但信息与观点必须准确清楚。
目标：让用户快速掌握更新，并能直接做判断/下一步动作。
Priority scale: P5 最重要，P1 最低。

输出要求：
- 使用中文输出。
- 必须使用 Markdown 标题与列表。
- 只基于提供内容，不得臆测。
- 输出必须直接从 “## Brief Updates” 开始，不要添加任何引言、说明句或总结收尾。
- 不要在正文中提及 “Cortex” 或 persona 相关字样。
- 所有提及的内容必须带来源标签，格式严格为： [SOURCE: <SourceName> | URL: <ArticleUrl>]
  - 标签必须出现在每条 bullet 或每个段落的末尾（推荐），或段落开头。
  - ArticleUrl 必须来自提供的 URL 字段；如果没有 URL，请写 URL: none
  - SourceName 必须与下面 Source Catalog 完全一致（大小写与空格都要匹配）。
  - 每条 bullet 或每个段落只能包含一个来源标签（不要在同一行放多个来源）。
- 三个板块顺序固定，标题必须严格使用下列三行（区分大小写且必须带 ## 作为二级标题）：
  1) ## Brief Updates
  2) ## Key Highlights
  3) ## Additional Focus
- Brief Updates 写成叙述型段落，不使用 bullet：3-6 个段落，每段 1 句、纯流水账（例如“某公司提到…/某机构发布研究关于…”），不写 Implication，结尾带来源标签。
- Key Highlights（P4-P5）：尽量覆盖所有高优先级内容，用 bullet 列表。每条 2-4 句：前 1-2 句是事实总结（不写“主题/事实”等字样），接着 1 句以 “Implication:” 开头，写对个股/行业/叙事的直接影响（必要时在 Implication 里补充“历史延续/重复出现”并简述变化）。结尾带来源标签。
- Additional Focus（P1-P3）：12-25 条 bullet，每条 1-2 句：先简要事实，再 1 句以 “Implication:” 开头写直接影响。结尾带来源标签。
- 如果条目太多，只能基于子集总结，请在 Brief Updates 最后一段末尾仅添加“基于子集”字样，不要出现数字或解释。
- 每条 bullet 或每个段落必须包含对市场/行业/个股/叙事(narrative)的潜在影响（用一句话点明即可，放在 Implication 中）。
- 只写相对直接、证据支持的影响，不夸大、不跳跃推断。
- 对照 Historical Summary Context：如果当前内容与历史摘要中的主题重复/延续，在对应条目中明确写“历史延续/重复出现”并简述变化；如果没有关联，不要强行牵引。
  (You only have ${selectedItems.length} items provided out of ${totalUnreadCount} unread items.)

格式示例：
## Brief Updates
某公司提到新产品进展。 [SOURCE: Example Source | URL: https://example.com/a]
某机构发布研究关于产能扩张。 [SOURCE: Example Source | URL: https://example.com/b]

## Key Highlights
- 存储周期与 AI 需求再定价的叙事出现边际强化，市场对产能利用率的预期发生变化。Implication: 盈利弹性向头部厂商集中，估值锚点更可能上移（直接影响）。 [SOURCE: Example Source | URL: https://example.com/c]

## Additional Focus
- 简要补充信息，保持简洁。Implication: 对相关个股/行业影响轻度但明确。 [SOURCE: Example Source | URL: https://example.com/d]

Source Catalog（必须严格匹配）:
${sourceCatalog}

Historical Summary Context (most recent first):
${historyContext}

Metadata:
- Total unread items: ${totalUnreadCount}
- Sources: ${unreadSourceCount}
- Priority distribution: ${prioritySummary}

Unread items (prioritized and trimmed):
${itemLines}
    `.trim();

    const wantsStream =
      new URL(req.url).searchParams.get('stream') === '1' ||
      (req.headers.get('Accept') || '').includes('text/event-stream');

    if (wantsStream) {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:streamGenerateContent?alt=sse&key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', geminiResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Gemini API error: ' + errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metadata = {
        itemCount: totalUnreadCount,
        sourceCount: unreadSourceCount,
        priorityCounts,
      };

      let streamedSummary = '';

      const transformStream = new TransformStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ type: 'meta', metadata })}\n\n`)
          );
        },
        transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const data = JSON.parse(payload);
              const parts = data.candidates?.[0]?.content?.parts || [];
              for (const part of parts) {
                if (part.text) {
                  streamedSummary += part.text;
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: 'delta', text: part.text })}\n\n`
                    )
                  );
                }
              }
            } catch (error) {
              console.log('Failed to parse Gemini stream payload');
            }
          }
        },
        async flush(controller) {
          if (streamedSummary) {
            await insertSummaryHistory(streamedSummary);
          }

          await markUnreadAsRead();

          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        },
      });

      return new Response(geminiResponse.body?.pipeThrough(transformStream), {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Gemini API error: ' + errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const summaryText =
      geminiData?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
      '';

    if (summaryText) {
      await insertSummaryHistory(summaryText);
    }

    await markUnreadAsRead();

    return new Response(
      JSON.stringify({
        summary: summaryText || 'Summary generation returned empty content.',
        metadata: {
          itemCount: totalUnreadCount,
          sourceCount: unreadSourceCount,
          priorityCounts,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-research-summary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
