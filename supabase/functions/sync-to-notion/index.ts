import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  action?: 'test'; // Optional action for testing connection
  pageId?: string; // Page ID for testing
  type?: 'daily' | 'stock' | 'weekly_notes'; // Type of sync
  date?: string; // ISO date string
  content?: string; // For weekly_notes type, pass content directly
}

// Helper function to convert HTML to Notion blocks (moved outside serve for hoisting)
const htmlToNotionBlocks = (html: string) => {
  const blocks: any[] = [];
  
  const parseRichText = (text: string) => {
    const richTexts: any[] = [];
    
    const formatPattern = /<(strong|b|em|i|u)>(.*?)<\/\1>/g;
    const parts: Array<{ text: string; bold?: boolean; italic?: boolean; underline?: boolean }> = [];
    
    let lastIndex = 0;
    let match;
    
    while ((match = formatPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const plainText = text.substring(lastIndex, match.index).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        if (plainText) parts.push({ text: plainText });
      }
      
      const tag = match[1];
      const content = match[2].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      if (content) {
        parts.push({
          text: content,
          bold: tag === 'strong' || tag === 'b',
          italic: tag === 'em' || tag === 'i',
          underline: tag === 'u',
        });
      }
      
      lastIndex = formatPattern.lastIndex;
    }
    
    if (lastIndex < text.length) {
      const plainText = text.substring(lastIndex).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      if (plainText) parts.push({ text: plainText });
    }
    
    parts.forEach(part => {
      if (part.text.trim()) {
        const richText: any = {
          type: 'text',
          text: { content: part.text },
        };
        
        if (part.bold || part.italic || part.underline) {
          richText.annotations = {
            bold: part.bold || false,
            italic: part.italic || false,
            underline: part.underline || false,
          };
        }
        
        richTexts.push(richText);
      }
    });
    
    return richTexts;
  };
  
  const listItemPattern = /<li[^>]*>(.*?)<\/li>/gs;
  let inList = false;
  let listType = '';
  
  const tagPattern = /<(p|h[1-6]|ul|ol)(?:[^>]*)>|<\/(p|h[1-6]|ul|ol)>/g;
  let tagMatch;
  
  while ((tagMatch = tagPattern.exec(html)) !== null) {
    const isClosing = tagMatch[0].startsWith('</');
    const tag = isClosing ? tagMatch[2] : tagMatch[1];
    
    if (!isClosing) {
      if (tag === 'ul' || tag === 'ol') {
        inList = true;
        listType = tag;
        const listStart = tagMatch.index;
        const listEnd = html.indexOf(`</${tag}>`, listStart);
        const listContent = html.substring(listStart, listEnd);
        
        const liMatches = Array.from(listContent.matchAll(listItemPattern));
        liMatches.forEach(liMatch => {
          const richTexts = parseRichText(liMatch[1]);
          if (richTexts.length > 0) {
            const blockType = listType === 'ul' ? 'bulleted_list_item' : 'numbered_list_item';
            blocks.push({
              object: 'block',
              type: blockType,
              [blockType]: {
                rich_text: richTexts,
              },
            });
          }
        });
      } else if (tag.match(/^h[1-6]$/)) {
        const headingEnd = html.indexOf(`</${tag}>`, tagMatch.index);
        const headingContent = html.substring(tagMatch.index + tagMatch[0].length, headingEnd);
        const richTexts = parseRichText(headingContent);
        
        if (richTexts.length > 0) {
          const headingLevel = tag === 'h1' ? 'heading_1' : tag === 'h2' ? 'heading_2' : 'heading_3';
          blocks.push({
            object: 'block',
            type: headingLevel,
            [headingLevel]: {
              rich_text: richTexts,
            },
          });
        }
      } else if (tag === 'p' && !inList) {
        const pEnd = html.indexOf('</p>', tagMatch.index);
        const pContent = html.substring(tagMatch.index + tagMatch[0].length, pEnd);
        const richTexts = parseRichText(pContent);
        
        if (richTexts.length > 0) {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: richTexts,
            },
          });
        }
      }
    } else if (tag === 'ul' || tag === 'ol') {
      inList = false;
    }
  }
  
  if (blocks.length === 0) {
    const plainText = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (plainText) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: plainText.substring(0, 2000) },
          }],
        },
      });
    }
  }
  
  return blocks;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    const marketNotesDbId = Deno.env.get('NOTION_MARKET_NOTES_DB_ID');
    const stockNotesDbId = Deno.env.get('NOTION_STOCK_NOTES_DB_ID');
    const weeklyNotesDbId = Deno.env.get('NOTION_WEEKLY_NOTES_DB_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!notionApiKey) {
      throw new Error('Missing NOTION_API_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, pageId, type, date, content }: SyncRequest = await req.json();
    
    console.log('Sync-to-Notion request', { action, pageId, type, date });

    // Handle test action - just check if we can access the Notion page
    if (action === 'test' && pageId) {
      console.log('[Notion] Testing connection for page:', pageId);
      
      const cleanPageId = pageId.replace(/-/g, '');
      const pageResponse = await fetch(`https://api.notion.com/v1/pages/${cleanPageId}`, {
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (pageResponse.ok) {
        console.log('[Notion] Connection test successful');
        return new Response(
          JSON.stringify({ success: true, message: 'Notion page accessible' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorText = await pageResponse.text();
        console.error('[Notion] Connection test failed:', pageResponse.status, errorText);
        return new Response(
          JSON.stringify({ success: false, message: 'Cannot access Notion page' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    console.log('Starting sync to Notion', { type, date });

    // Handle weekly_notes type directly (content passed from frontend)
    if (type === 'weekly_notes') {
      if (!weeklyNotesDbId) {
        throw new Error('Missing NOTION_WEEKLY_NOTES_DB_ID');
      }
      if (!date || !content) {
        throw new Error('Missing date or content for weekly_notes sync');
      }

      const notionBlocks = htmlToNotionBlocks(content);
      
      if (notionBlocks.length === 0) {
        throw new Error('No content to sync');
      }

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: weeklyNotesDbId },
          properties: {
            'Title': {
              title: [
                {
                  text: {
                    content: `Weekly Notes - ${date}`,
                  },
                },
              ],
            },
            'Date': {
              date: {
                start: date,
              },
            },
          },
          children: notionBlocks.slice(0, 100),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to sync weekly notes:', error);
        throw new Error(`Failed to sync weekly notes: ${error}`);
      }

      console.log(`Synced weekly notes for ${date}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          synced: { weeklyNotes: 1 },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Original logic for daily and stock notes
    if (!marketNotesDbId || !stockNotesDbId) {
      throw new Error('Missing Notion database IDs for daily/stock notes');
    }

    // Fetch daily notes
    let dailyNotesQuery = supabase.from('daily_notes').select('*');
    if (date) {
      dailyNotesQuery = dailyNotesQuery.eq('date', date);
    }
    const { data: dailyNotes, error: dailyError } = await dailyNotesQuery;
    
    if (dailyError) throw dailyError;

    // Fetch stock notes
    let stockNotesQuery = supabase.from('stock_notes').select('*');
    if (date) {
      stockNotesQuery = stockNotesQuery.eq('date', date);
    }
    const { data: stockNotes, error: stockError } = await stockNotesQuery;
    
    if (stockError) throw stockError;

    console.log(`Found ${dailyNotes?.length || 0} daily notes and ${stockNotes?.length || 0} stock notes`);

    let syncedMarket = 0;
    let syncedStock = 0;

    // Sync daily notes to Notion
    if (dailyNotes && dailyNotes.length > 0) {
      for (const note of dailyNotes) {
        try {
          const notionBlocks = htmlToNotionBlocks(note.content);
          
          if (notionBlocks.length === 0) continue;

          const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${notionApiKey}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify({
              parent: { database_id: marketNotesDbId },
              properties: {
                'Title': {
                  title: [
                    {
                      text: {
                        content: `Market Notes - ${note.date}`,
                      },
                    },
                  ],
                },
                'Date': {
                  date: {
                    start: note.date,
                  },
                },
              },
              children: notionBlocks.slice(0, 100), // Notion has a limit of 100 blocks per request
            }),
          });

          if (response.ok) {
            syncedMarket++;
            console.log(`Synced market note for ${note.date}`);
          } else {
            const error = await response.text();
            console.error(`Failed to sync market note for ${note.date}:`, error);
          }
        } catch (error) {
          console.error(`Error syncing market note for ${note.date}:`, error);
        }
      }
    }

    // Sync stock notes to Notion
    if (stockNotes && stockNotes.length > 0) {
      for (const note of stockNotes) {
        try {
          const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${notionApiKey}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify({
              parent: { database_id: stockNotesDbId },
              properties: {
                'Title': {
                  title: [
                    {
                      text: {
                        content: `${note.symbol} - ${note.date}`,
                      },
                    },
                  ],
                },
                'Symbol': {
                  rich_text: [
                    {
                      text: {
                        content: note.symbol,
                      },
                    },
                  ],
                },
                'Date': {
                  date: {
                    start: note.date,
                  },
                },
              },
              children: [
                {
                  object: 'block',
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [
                      {
                        type: 'text',
                        text: {
                          content: note.note.substring(0, 2000),
                        },
                      },
                    ],
                  },
                },
              ],
            }),
          });

          if (response.ok) {
            syncedStock++;
            console.log(`Synced stock note for ${note.symbol} - ${note.date}`);
          } else {
            const error = await response.text();
            console.error(`Failed to sync stock note for ${note.symbol}:`, error);
          }
        } catch (error) {
          console.error(`Error syncing stock note for ${note.symbol}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          marketNotes: syncedMarket,
          stockNotes: syncedStock,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-to-notion function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
