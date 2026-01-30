import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web search using Perplexity
async function searchWeb(query: string, perplexityApiKey: string): Promise<{ content: string; citations: string[] }> {
  try {
    console.log('[Web Search] Searching:', query);
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a research assistant. Provide factual, concise information with data points when available. Focus on market size, competitors, recent funding, and industry trends.' },
          { role: 'user', content: query }
        ],
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      console.error('[Web Search] API error:', response.status);
      return { content: '', citations: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    console.log('[Web Search] Success, citations:', citations.length);
    return { content, citations };
  } catch (error) {
    console.error('[Web Search] Error:', error);
    return { content: '', citations: [] };
  }
}

// Fetch Notion page content by URL
async function fetchNotionFolder(folderUrl: string, notionApiKey: string): Promise<{ success: boolean; content: string }> {
  try {
    console.log('[Notion] Fetching folder:', folderUrl);
    
    const urlMatch = folderUrl.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (!urlMatch) {
      console.log('[Notion] Could not extract page ID from URL');
      return { success: false, content: '' };
    }
    
    const pageId = urlMatch[1].replace(/-/g, '');
    console.log('[Notion] Extracted page ID:', pageId);
    
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!pageResponse.ok) {
      console.error('[Notion] Failed to fetch page:', pageResponse.status);
      return { success: false, content: '' };
    }

    const pageData = await pageResponse.json();
    let pageTitle = '';
    
    if (pageData.properties) {
      for (const [key, value] of Object.entries(pageData.properties)) {
        if ((value as any)?.title?.[0]?.plain_text) {
          pageTitle = (value as any).title[0].plain_text;
          break;
        }
      }
    }

    const allContent: string[] = [];
    allContent.push(`# ${pageTitle || 'Untitled Page'}\n`);
    
    await fetchBlocksRecursively(pageId, notionApiKey, allContent, 0);
    
    console.log(`[Notion] Successfully fetched ${allContent.length} content blocks`);
    return { success: true, content: allContent.join('\n') };
  } catch (error) {
    console.error('[Notion] Fetch error:', error);
    return { success: false, content: '' };
  }
}

async function fetchBlocksRecursively(blockId: string, notionApiKey: string, content: string[], depth: number) {
  if (depth > 3) return;
  
  try {
    const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!blocksResponse.ok) return;

    const blocksData = await blocksResponse.json();
    
    for (const block of blocksData.results || []) {
      const blockType = block.type;
      const blockContent = block[blockType];
      
      if (blockContent?.rich_text) {
        const text = blockContent.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) {
          const indent = '  '.repeat(depth);
          if (blockType === 'heading_1') {
            content.push(`${indent}## ${text}`);
          } else if (blockType === 'heading_2') {
            content.push(`${indent}### ${text}`);
          } else if (blockType === 'heading_3') {
            content.push(`${indent}#### ${text}`);
          } else if (blockType === 'bulleted_list_item' || blockType === 'numbered_list_item') {
            content.push(`${indent}- ${text}`);
          } else {
            content.push(`${indent}${text}`);
          }
        }
      }
      
      if (blockType === 'child_page' && block.id) {
        content.push(`\n### Sub-page: ${blockContent?.title || 'Untitled'}\n`);
        await fetchBlocksRecursively(block.id, notionApiKey, content, depth + 1);
      }
      
      if (blockType === 'child_database' && block.id) {
        content.push(`\n### Database: ${blockContent?.title || 'Untitled'}\n`);
        await fetchDatabaseContent(block.id, notionApiKey, content);
      }
      
      if (block.has_children && blockType !== 'child_page' && blockType !== 'child_database') {
        await fetchBlocksRecursively(block.id, notionApiKey, content, depth + 1);
      }
    }
  } catch (error) {
    console.error('[Notion] Block fetch error:', error);
  }
}

async function fetchDatabaseContent(databaseId: string, notionApiKey: string, content: string[]) {
  try {
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ page_size: 50 }),
    });

    if (!dbResponse.ok) return;

    const dbData = await dbResponse.json();
    
    for (const page of dbData.results || []) {
      const props: string[] = [];
      for (const [key, value] of Object.entries(page.properties || {})) {
        const propValue = extractPropertyValue(value);
        if (propValue) {
          props.push(`${key}: ${propValue}`);
        }
      }
      if (props.length > 0) {
        content.push(`- ${props.join(' | ')}`);
      }
    }
  } catch (error) {
    console.error('[Notion] Database fetch error:', error);
  }
}

function extractPropertyValue(prop: any): string {
  if (!prop) return '';
  
  switch (prop.type) {
    case 'title':
      return prop.title?.[0]?.plain_text || '';
    case 'rich_text':
      return prop.rich_text?.[0]?.plain_text || '';
    case 'number':
      return prop.number?.toString() || '';
    case 'select':
      return prop.select?.name || '';
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name).join(', ') || '';
    case 'date':
      return prop.date?.start || '';
    case 'checkbox':
      return prop.checkbox ? 'Yes' : 'No';
    case 'url':
      return prop.url || '';
    case 'email':
      return prop.email || '';
    case 'phone_number':
      return prop.phone_number || '';
    default:
      return '';
  }
}

function buildPrompt(
  analysisType: string,
  dealInfo: string,
  notionContent: string,
  webSearchContent: string,
  webCitations: string[],
  inputData: Record<string, any>
): string {
  // Custom persona and writing style instructions
  const personaInstructions = `
## 身份与工作风格

你是资深的行业专家和训练有素的 high-finance investment analyst。有条不紊，以数据为导向，致力于深入分析。你重视准确性、逻辑推理和基于证据的决策。你系统地处理问题，深思熟虑。你相信更好的信息会带来更好的决策。

## 输出风格要求

- 使用简洁的表达方式，最大限度地提高信息密度
- 段落简短，层次清晰
- 主要使用主动语态
- 避免使用填充词或冗余短语
- 直接回应核心诉求，使用的每一个词都有其目的
- 主要用中文输出，语言平实，必须要有活人感，ai感弱
- 可以有刻意的小病句或者不完美的书面表达习惯，中英混合等
- 通过有针对性的问题进行系统的信息收集
- 为组织讨论主题提供清晰的框架
- 对推理过程进行逐步解释
- 在提出建议之前进行全面总结
- 提供多种选择时进行利弊分析
`;

  const baseContext = `
${personaInstructions}

## Deal Information:
${dealInfo}

${notionContent ? `## Project Folder Content (from Notion):
${notionContent}` : ''}

${webSearchContent ? `## Web Research (Recent Market Data):
${webSearchContent}

Sources: ${webCitations.slice(0, 5).join(', ')}` : ''}
`;

  switch (analysisType) {
    case 'interview_outline':
      return `${baseContext}

## User Requirements:
- Interviewee: ${inputData.interviewee || 'Not specified'}
- Focus Areas: ${inputData.focusAreas || 'General due diligence'}

## Task:
Create a detailed interview outline with:
1. Opening questions to build rapport
2. Key questions organized by topic area
3. Deep-dive questions based on the focus areas
4. Questions to understand competitive landscape
5. Closing questions and next steps

Format the output in clear markdown with sections and bullet points.`;

    case 'investment_highlights':
      return `${baseContext}

## Task:
提炼并输出 **1-5个核心投资逻辑（Investment Thesis）**，用于向合伙人、潜在投资人pitch，或用于市场宣传。

### 输出要求：
1. **每个投资逻辑一个标题**（简洁有力，可以偏抽象/概念化）
2. **每个逻辑下面2-4句话解释**，必须有数据支撑（市场规模、增长率、竞争格局、财务数据等）
3. **语言风格**：适合对外pitch，既要有高度概括的thesis，又要有说服力的数据佐证
4. **数量**：根据项目本身特点，输出1-5个最核心的逻辑，不需要面面俱到，宁缺毋滥

### 输出格式示例：
## 投资逻辑

### 1. [Thesis标题]
[2-4句解释，包含关键数据点]

### 2. [Thesis标题]
[2-4句解释，包含关键数据点]

...

---
**注意**：不要输出风险、估值等其他内容，只聚焦核心投资逻辑。`;

    case 'ic_memo':
      return `${baseContext}

## Requested Section: ${inputData.section || 'Executive Summary'}

## Task:
Write a professional IC memo section for "${inputData.section}" that includes:
- Clear and concise analysis
- Supporting data points where available
- Relevant comparisons or benchmarks
- Risk factors specific to this section
- Recommendations or key takeaways

Format the output in professional memo style with clear headers and paragraphs.`;

    case 'industry_mapping':
      return `${baseContext}

## Target Sector/Track: ${inputData.sector || 'Not specified'}

## Task:
Create a comprehensive industry mapping including:
1. Industry Overview & Size
2. Key Market Segments
3. Major Players & Competitive Landscape
   - Create a comparison table if possible
4. Value Chain Analysis
5. Key Trends & Drivers
6. Investment Themes in this Sector
7. Where this company fits in the landscape

Format the output in clear markdown with sections, tables where appropriate, and bullet points.`;

    case 'notes_summary':
      return `${baseContext}

## Meeting Transcript/Notes:
${inputData.meetingNotes || 'No notes provided'}

## Task:
Create a structured summary of the meeting including:
1. Meeting Overview (date, participants if mentioned, purpose)
2. Key Discussion Points
3. Important Insights & Takeaways
4. Action Items (if any)
5. Follow-up Questions
6. Notable Quotes or Data Points

Format the output in clear markdown with sections and bullet points.`;

    default:
      return `${baseContext}\n\nAnalyze the above deal information and provide insights.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId, analysisType, inputData } = await req.json();
    
    console.log('[Deal Analysis] Request:', { dealId, analysisType, inputData });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch deal information
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      throw new Error("Deal not found");
    }

    // Format deal info
    const dealInfo = `
Project Name: ${deal.project_name}
Description: ${deal.description || 'N/A'}
Sector: ${deal.sector || 'N/A'}
Status: ${deal.status || 'N/A'}
HQ Location: ${deal.hq_location || 'N/A'}
Funding Round: ${deal.funding_round || 'N/A'}
Funding Amount: ${deal.funding_amount || 'N/A'}
Valuation/Terms: ${deal.valuation_terms || 'N/A'}
BU Category: ${deal.bu_category || 'N/A'}
Source: ${deal.source || 'N/A'}
Leads: ${deal.leads || 'N/A'}
Followers: ${deal.followers || 'N/A'}
Key Contacts: ${deal.key_contacts || 'N/A'}
Pre-Investors: ${deal.pre_investors || 'N/A'}
Financials: ${deal.financials || 'N/A'}
Benchmark Companies: ${deal.benchmark_companies || 'N/A'}
Feedback Notes: ${deal.feedback_notes || 'N/A'}
Deal Date: ${deal.deal_date || 'N/A'}
`;

    // Try to fetch Notion content if folder_link exists
    let notionContent = '';
    let notionConnected = false;
    
    if (deal.folder_link && NOTION_API_KEY) {
      console.log('[Deal Analysis] Attempting to fetch Notion folder:', deal.folder_link);
      const notionResult = await fetchNotionFolder(deal.folder_link, NOTION_API_KEY);
      notionConnected = notionResult.success;
      notionContent = notionResult.content;
      console.log('[Deal Analysis] Notion connected:', notionConnected);
    }

    // Web search for additional context
    let webSearchContent = '';
    let webCitations: string[] = [];
    let webConnected = false;
    
    if (PERPLEXITY_API_KEY) {
      const searchQuery = `${deal.project_name} ${deal.sector || ''} company funding market size competitors recent news`;
      console.log('[Deal Analysis] Performing web search for:', deal.project_name);
      const webResult = await searchWeb(searchQuery, PERPLEXITY_API_KEY);
      webSearchContent = webResult.content;
      webCitations = webResult.citations;
      webConnected = webResult.content.length > 0;
      console.log('[Deal Analysis] Web search connected:', webConnected);
    }

    // Build the prompt
    const prompt = buildPrompt(analysisType, dealInfo, notionContent, webSearchContent, webCitations, inputData || {});

    // Call Gemini API with streaming (using gemini-3-pro-preview)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
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
      return new Response(JSON.stringify({ error: "AI API error: " + errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE to OpenAI-compatible SSE format
    const transformStream = new TransformStream({
      start(controller) {
        const metadata = {
          notionConnected,
          webConnected,
          webCitations: webCitations.slice(0, 5),
          dealName: deal.project_name,
        };
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ metadata })}\n\n`));
      },
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const parts = data.candidates?.[0]?.content?.parts || [];
              
              for (const part of parts) {
                if (part.text) {
                  const openaiFormat = {
                    choices: [{
                      delta: { content: part.text }
                    }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                }
              }
            } catch (e) {
              // Skip invalid JSON
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
    console.error("Deal analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
