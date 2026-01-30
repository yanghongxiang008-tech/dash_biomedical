import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, Sparkles, Square, ChevronDown, ChevronRight, Brain, Database, Globe, History, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ConnectionStatus from './ConnectionStatus';
import NotionIcon from './NotionIcon';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  isThinking?: boolean;
  timestamp?: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  isFavorite: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const STORAGE_KEY = 'public-ai-chat-conversations';

const THINKING_PHASE_KEYS = ['Thinking', 'Reasoning', 'Synthesizing'];

// Animated Brain Icon with stroke animation
const AnimatedBrainIcon = () => {
  return (
    <div className="relative w-4 h-4">
      <Brain className="w-4 h-4 text-primary animate-pulse" />
      <svg 
        className="absolute inset-0 w-4 h-4" 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <circle 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeDasharray="62.8" 
          strokeDashoffset="0"
          className="text-primary/30 animate-[spin_3s_linear_infinite]"
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
};

// Thinking animation component with rotating text
const ThinkingIndicator = ({ thinkingContent }: { thinkingContent?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const { t } = useI18n();
  const phases = THINKING_PHASE_KEYS.map((key) => t(key));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % THINKING_PHASES.length);
    }, 4000); // Slower transition - 4 seconds instead of 2
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <AnimatedBrainIcon />
        <span className="font-medium transition-all duration-300">{phases[phaseIndex]}...</span>
        {thinkingContent && (isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
      </CollapsibleTrigger>
        {thinkingContent && (
          <CollapsibleContent>
            <div className="mt-2 pl-6 text-xs text-muted-foreground/80 border-l-2 border-primary/20 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {thinkingContent}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

// Completed thinking display
const ThinkingDisplay = ({ thinkingContent }: { thinkingContent: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  
  if (!thinkingContent) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-3">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors">
        <Brain className="w-3 h-3" />
        <span>{t('View reasoning')}</span>
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 pl-4 text-xs text-muted-foreground/70 border-l-2 border-muted/50 whitespace-pre-wrap max-h-64 overflow-y-auto">
          {thinkingContent}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
interface AIChatProps {
  placeholderText?: string;
}

const AIChat = ({ placeholderText }: AIChatProps) => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState({
    hasDatabase: true,
    hasNotion: false,
    hasWeb: false,
  });
  const [availableConnections, setAvailableConnections] = useState({
    hasNotion: false,
    hasWeb: false,
  });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load conversations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load conversations');
      }
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 50)));
    }
  }, [conversations]);

  // Auto-save current conversation
  useEffect(() => {
    if (messages.length > 0 && currentConversationId) {
      setConversations(prev => prev.map(c => 
        c.id === currentConversationId 
          ? { ...c, messages, title: generateTitle(messages) }
          : c
      ));
    }
  }, [messages, currentConversationId]);

  // Generate title from first user message
  const generateTitle = (msgs: Message[]): string => {
    const firstUserMsg = msgs.find(m => m.role === 'user');
    if (!firstUserMsg) return t('New Chat');
    return firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
  };

  // Check available connections on mount
  useEffect(() => {
    const checkConnections = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-status`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const status = await response.json();
          setAvailableConnections({
            hasNotion: status.hasNotion || false,
            hasWeb: status.hasWeb || false,
          });
          setConnectionStatus({
            hasDatabase: true,
            hasNotion: status.hasNotion || false,
            hasWeb: false,
          });
        }
      } catch (error) {
        console.log('Could not fetch connection status');
      }
    };
    checkConnections();
  }, []);

  // Toggle handlers
  const handleToggleNotion = () => {
    if (availableConnections.hasNotion) {
      setConnectionStatus(prev => ({ ...prev, hasNotion: !prev.hasNotion }));
    }
  };

  const handleToggleWeb = () => {
    if (availableConnections.hasWeb) {
      setConnectionStatus(prev => ({ ...prev, hasWeb: !prev.hasWeb }));
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    const newId = Date.now().toString();
    const newConv: Conversation = {
      id: newId,
      title: t('New Chat'),
      messages: [],
      createdAt: Date.now(),
      isFavorite: false,
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newId);
    setMessages([]);
    setShowHistory(false);
  };

  // Track if we should scroll (only after user sends a message)
  const shouldScrollRef = useRef(false);
  
  // Load conversation - should NOT trigger scroll
  const loadConversation = (conv: Conversation) => {
    shouldScrollRef.current = false; // Explicitly disable scrolling when loading history
    setCurrentConversationId(conv.id);
    setMessages(conv.messages);
    setShowHistory(false);
  };

  // Toggle favorite
  const toggleFavorite = (convId: string) => {
    setConversations(prev => prev.map(c => 
      c.id === convId ? { ...c, isFavorite: !c.isFavorite } : c
    ));
  };

  // Delete conversation
  const deleteConversation = (convId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (currentConversationId === convId) {
      setCurrentConversationId(null);
      setMessages([]);
    }
  };

  // Scroll within messages container only - never scroll the page
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Scroll to bottom only when user sends a new message (not when loading history)
  useEffect(() => {
    if (shouldScrollRef.current) {
      // Small delay to ensure content is rendered
      setTimeout(scrollToBottom, 50);
      shouldScrollRef.current = false;
    }
  }, [messages.length]);

  // Auto-resize textarea - expands downward
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '80px'; // Reset to base height
      const scrollHeight = textareaRef.current.scrollHeight;
      if (scrollHeight > 80) {
        textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
      }
    }
  }, [input]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          if (!lastMessage.content) {
            return newMessages.slice(0, -1);
          }
          lastMessage.isThinking = false;
        }
        return newMessages;
      });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    // Create new conversation if none exists
    if (!currentConversationId) {
      startNewConversation();
    }

    // Enable scrolling when user sends a message
    shouldScrollRef.current = true;

    const userMessage: Message = { role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Immediately show thinking state before request starts
    setMessages(prev => [...prev, { role: 'assistant', content: '', thinking: '', isThinking: true }]);

    abortControllerRef.current = new AbortController();
    let assistantContent = '';
    let thinkingContent = '';
    let isCurrentlyThinking = true;

    try {
      // Get the user's session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Assistant message already added above, no need to add again

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            const content = delta?.content;
            const isThinkingChunk = delta?.thinking === true;
            
            if (content) {
              if (isThinkingChunk) {
                thinkingContent += content;
                isCurrentlyThinking = true;
              } else {
                assistantContent += content;
                isCurrentlyThinking = false;
              }
              
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                  thinking: thinkingContent,
                  isThinking: isCurrentlyThinking && !assistantContent
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          lastMessage.isThinking = false;
        }
        return newMessages;
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request cancelled by user');
        return;
      }
      
      console.error('Chat error:', error);
      toast({
        title: t('Error'),
        description: error instanceof Error ? error.message : t('Failed to send message'),
        variant: 'destructive',
      });
      if (assistantContent === '') {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      {/* Header with New Chat, ConnectionStatus, and History */}
      <div className="py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={startNewConversation}
            className="text-xs h-7 px-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t('New')}
          </Button>
          <ConnectionStatus
            hasDatabase={connectionStatus.hasDatabase}
            hasNotion={connectionStatus.hasNotion}
            hasWeb={connectionStatus.hasWeb}
            onToggleNotion={availableConnections.hasNotion ? handleToggleNotion : undefined}
            onToggleWeb={availableConnections.hasWeb ? handleToggleWeb : undefined}
          />
        </div>
        <DropdownMenu open={showHistory} onOpenChange={setShowHistory}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2 data-[state=open]:bg-muted"
          >
            <History className="w-3.5 h-3.5 mr-1" />
            {t('History')}
            <ChevronDown className={cn("w-3 h-3 ml-1 transition-transform", showHistory && "rotate-180")} />
          </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end"
            sideOffset={4}
            className="min-w-[200px]"
          >
            <ScrollArea className="max-h-[200px]">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 px-3 text-muted-foreground">
                  <Sparkles className="w-4 h-4 mb-1 opacity-40" />
                  <p className="text-xs">{t('No history')}</p>
                </div>
              ) : (
                <>
                  {conversations.map(conv => (
                    <DropdownMenuItem 
                      key={conv.id}
                      className="group flex items-center gap-2 cursor-pointer"
                      onClick={() => loadConversation(conv)}
                    >
                      <span className="flex-1 text-xs truncate max-w-[150px]">{conv.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty State */}
      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              {placeholderText || t('Ask me anything about tracked stocks, market/stock notes, and research knowledge hub.')}
            </p>
          </div>
        </div>
      )}

      {/* Messages Area - internal scroll only, never scroll page */}
      {messages.length > 0 && (
        <div 
          ref={messagesContainerRef} 
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="py-4 space-y-5">
            {messages.map((message, index) => (
              <div key={index} className="animate-fade-in">
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-background border border-border/60 text-foreground text-sm shadow-sm">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-foreground">
                    {message.isThinking && !message.content ? (
                      <ThinkingIndicator thinkingContent={message.thinking} />
                    ) : (
                      <>
                        {message.thinking && <ThinkingDisplay thinkingContent={message.thinking} />}
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-sans prose-h1:text-base prose-h1:font-semibold prose-h2:text-sm prose-h2:font-semibold prose-h3:text-sm prose-h3:font-medium prose-h4:text-xs prose-h4:font-medium prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:text-xs prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-table:border-collapse prose-table:w-full prose-table:text-sm prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-2 prose-th:py-1.5 prose-th:text-left prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1.5 prose-strong:font-semibold">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => {
                                const getTextContent = (node: React.ReactNode): string => {
                                  if (typeof node === 'string') return node;
                                  if (typeof node === 'number') return String(node);
                                  if (Array.isArray(node)) return node.map(getTextContent).join('');
                                  if (node && typeof node === 'object' && 'props' in node) {
                                    return getTextContent((node as React.ReactElement).props.children);
                                  }
                                  return '';
                                };
                                const text = getTextContent(children);
                                
                                const dbPattern = /^[\s\-\*\d\.]*\[(?:DB|Database)\]:?\s*/i;
                                const notionPattern = /^[\s\-\*\d\.]*\[(?:NOTION)\]:?\s*/i;
                                const webPattern = /^[\s\-\*\d\.]*\[(?:WEB)\]:?\s*/i;
                                
                                const hasDbInline = /\[(?:DB|Database)\]/i.test(text);
                                const hasNotionInline = /\[NOTION\]/i.test(text);
                                const hasWebInline = /\[WEB\]/i.test(text);
                                
                                if (dbPattern.test(text) || hasDbInline) {
                                  const cleanText = text.replace(/\[(?:DB|Database)\]:?\s*/gi, '').trim();
                                  return (
                                    <p className="flex items-start gap-1.5 my-1">
                                      <span className="inline-flex items-center justify-center w-4 h-4 mt-0.5 flex-shrink-0">
                                        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      </span>
                                      <span>{cleanText}</span>
                                    </p>
                                  );
                                }
                                if (notionPattern.test(text) || hasNotionInline) {
                                  const cleanText = text.replace(/\[NOTION\]:?\s*/gi, '').trim();
                                  return (
                                    <p className="flex items-start gap-1.5 my-1">
                                      <span className="inline-flex items-center justify-center w-4 h-4 mt-0.5 flex-shrink-0">
                                        <NotionIcon size={14} />
                                      </span>
                                      <span>{cleanText}</span>
                                    </p>
                                  );
                                }
                                if (webPattern.test(text) || hasWebInline) {
                                  const cleanText = text.replace(/\[WEB\]:?\s*/gi, '').trim();
                                  return (
                                    <p className="flex items-start gap-1.5 my-1">
                                      <span className="inline-flex items-center justify-center w-4 h-4 mt-0.5 flex-shrink-0">
                                        <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                      </span>
                                      <span>{cleanText}</span>
                                    </p>
                                  );
                                }
                                return <p>{children}</p>;
                              },
                              li: ({ children }) => {
                                const getTextContent = (node: React.ReactNode): string => {
                                  if (typeof node === 'string') return node;
                                  if (typeof node === 'number') return String(node);
                                  if (Array.isArray(node)) return node.map(getTextContent).join('');
                                  if (node && typeof node === 'object' && 'props' in node) {
                                    return getTextContent((node as React.ReactElement).props.children);
                                  }
                                  return '';
                                };
                                const text = getTextContent(children);
                                
                                const hasDb = /\[(?:DB|Database)\]/i.test(text);
                                const hasNotion = /\[NOTION\]/i.test(text);
                                const hasWeb = /\[WEB\]/i.test(text);
                                
                                if (hasDb) {
                                  const cleanText = text.replace(/\[(?:DB|Database)\]:?\s*/gi, '').trim();
                                  return (
                                    <li className="flex items-start gap-1.5">
                                      <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                      <span>{cleanText}</span>
                                    </li>
                                  );
                                }
                                if (hasNotion) {
                                  const cleanText = text.replace(/\[NOTION\]:?\s*/gi, '').trim();
                                  return (
                                    <li className="flex items-start gap-1.5">
                                      <span className="flex-shrink-0 mt-0.5"><NotionIcon size={14} /></span>
                                      <span>{cleanText}</span>
                                    </li>
                                  );
                                }
                                if (hasWeb) {
                                  const cleanText = text.replace(/\[WEB\]:?\s*/gi, '').trim();
                                  return (
                                    <li className="flex items-start gap-1.5">
                                      <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                      <span>{cleanText}</span>
                                    </li>
                                  );
                                }
                                return <li>{children}</li>;
                              }
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area - fixed at bottom */}
      <div className="pt-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-start gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('Ask a question...')}
              className="resize-none min-h-[88px] max-h-[200px] pr-4 rounded-xl border-border/50 focus:border-primary/50 bg-muted/30"
              style={{ overflow: input.split('\n').length > 4 ? 'auto' : 'hidden' }}
              rows={3}
            />
            {isLoading ? (
              <Button
                type="button"
                onClick={handleStop}
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
              >
                <Square className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim()}
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full flex-shrink-0 border-border/50 hover:bg-muted mt-1"
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
