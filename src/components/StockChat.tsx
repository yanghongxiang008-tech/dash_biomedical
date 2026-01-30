import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Reply, Search, Plus, X, Edit2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface Discussion {
  id: string;
  stock_symbol: string | null;
  industry_id: string | null;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

interface Industry {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface StockChatProps {
  stocks: Array<{ id: string; symbol: string; group_id: string }>;
  groups: Array<{ id: string; name: string }>;
}

const StockChat: React.FC<StockChatProps> = ({ stocks, groups }) => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<'stocks' | 'industries'>('stocks');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newIndustryName, setNewIndustryName] = useState('');
  const [editingIndustry, setEditingIndustry] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
    loadAllDiscussionCounts();
    loadIndustries();
  }, []);

  const loadIndustries = async () => {
    try {
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      setIndustries(data || []);
    } catch (error) {
      console.error('Error loading industries:', error);
    }
  };

  const loadAllDiscussionCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_discussions')
        .select('stock_symbol, industry_id, parent_id');
      
      if (error) throw error;
      
      // Only update discussion counts, not the actual discussions array
      // The discussions array should only be populated when viewing a specific stock/industry
    } catch (error) {
      console.error('Error loading discussion counts:', error);
    }
  };

  useEffect(() => {
    if (selectedStock) {
      fetchStockDiscussions(selectedStock);
    }
  }, [selectedStock]);

  useEffect(() => {
    if (selectedIndustry) {
      fetchIndustryDiscussions(selectedIndustry);
    }
  }, [selectedIndustry]);

  const fetchStockDiscussions = async (symbol: string) => {
    setLoading(true);
    try {
      const { data: discussionsData, error: discussionsError } = await supabase
        .from('stock_discussions')
        .select('*')
        .eq('stock_symbol', symbol)
        .is('industry_id', null)
        .order('created_at', { ascending: true });

      if (discussionsError) throw discussionsError;
      await enrichDiscussionsWithEmails(discussionsData || []);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load discussions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIndustryDiscussions = async (industryId: string) => {
    setLoading(true);
    try {
      const { data: discussionsData, error: discussionsError } = await supabase
        .from('stock_discussions')
        .select('*')
        .eq('industry_id', industryId)
        .is('stock_symbol', null)
        .order('created_at', { ascending: true });

      if (discussionsError) throw discussionsError;
      await enrichDiscussionsWithEmails(discussionsData || []);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load discussions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const enrichDiscussionsWithEmails = async (discussionsData: Discussion[]) => {
    const userIds = Array.from(new Set(discussionsData.map(d => d.user_id)));
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profilesData?.map(p => [p.id, p.email]) || []);

      const discussionsWithEmails = discussionsData.map(d => ({
        ...d,
        user_email: emailMap.get(d.user_id)
      }));

      setDiscussions(discussionsWithEmails);
    } else {
      setDiscussions(discussionsData);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !currentUserId) return;
    if (!selectedStock && !selectedIndustry) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('stock_discussions')
        .insert({
          stock_symbol: selectedStock,
          industry_id: selectedIndustry,
          user_id: currentUserId,
          content: newComment.trim(),
          parent_id: replyingTo
        });

      if (error) throw error;

      setNewComment('');
      setReplyingTo(null);
      
      if (selectedStock) {
        await fetchStockDiscussions(selectedStock);
      } else if (selectedIndustry) {
        await fetchIndustryDiscussions(selectedIndustry);
      }
      
      toast({
        title: t('Success'),
        description: replyingTo ? t('Reply posted') : t('Comment posted')
      });
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: t('Error'),
        description: t('Failed to post comment'),
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addIndustry = async () => {
    if (!newIndustryName.trim()) return;

    try {
      const maxOrder = industries.length > 0 
        ? Math.max(...industries.map(i => i.display_order)) 
        : 0;

      const { error } = await supabase
        .from('industries')
        .insert({
          name: newIndustryName.trim(),
          display_order: maxOrder + 1
        });

      if (error) throw error;

      setNewIndustryName('');
      await loadIndustries();
      await loadAllDiscussionCounts();
      
      toast({
        title: t('Success'),
        description: t('Industry added')
      });
    } catch (error) {
      console.error('Error adding industry:', error);
      toast({
        title: t('Error'),
        description: t('Failed to add industry'),
        variant: 'destructive'
      });
    }
  };

  const updateIndustry = async (id: string, name: string) => {
    if (!name.trim()) return;

    try {
      const { error } = await supabase
        .from('industries')
        .update({ name: name.trim() })
        .eq('id', id);

      if (error) throw error;

      setEditingIndustry(null);
      setEditingName('');
      await loadIndustries();
      
      toast({
        title: t('Success'),
        description: t('Industry updated')
      });
    } catch (error) {
      console.error('Error updating industry:', error);
      toast({
        title: t('Error'),
        description: t('Failed to update industry'),
        variant: 'destructive'
      });
    }
  };

  const deleteIndustry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('industries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (selectedIndustry === id) {
        setSelectedIndustry(null);
        setDiscussions([]);
      }

      await loadIndustries();
      await loadAllDiscussionCounts();
      
      toast({
        title: t('Success'),
        description: t('Industry deleted')
      });
    } catch (error) {
      console.error('Error deleting industry:', error);
      toast({
        title: t('Error'),
        description: t('Failed to delete industry'),
        variant: 'destructive'
      });
    }
  };

  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return stocks;
    const query = searchQuery.toLowerCase();
    return stocks.filter(s => s.symbol.toLowerCase().includes(query));
  }, [stocks, searchQuery]);

  const filteredIndustries = useMemo(() => {
    if (!searchQuery.trim()) return industries;
    const query = searchQuery.toLowerCase();
    return industries.filter(i => i.name.toLowerCase().includes(query));
  }, [industries, searchQuery]);

  const discussionCounts = useMemo(() => {
    const stockCounts: Record<string, number> = {};
    const industryCounts: Record<string, number> = {};
    
    discussions.forEach(d => {
      if (!d.parent_id) {
        if (d.stock_symbol) {
          stockCounts[d.stock_symbol] = (stockCounts[d.stock_symbol] || 0) + 1;
        }
        if (d.industry_id) {
          industryCounts[d.industry_id] = (industryCounts[d.industry_id] || 0) + 1;
        }
      }
    });
    
    return { stockCounts, industryCounts };
  }, [discussions]);

  const getInitials = (email?: string) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  const renderDiscussion = (discussion: Discussion, level: number = 0) => {
    const replies = discussions.filter(d => d.parent_id === discussion.id);
    const isOwnComment = discussion.user_id === currentUserId;

    return (
      <div 
        key={discussion.id} 
        className={cn(
          "animate-fade-in",
          level > 0 ? 'ml-6 mt-2' : 'mt-2'
        )}
      >
        <div className="flex gap-2.5 group">
          <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-border">
            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {getInitials(discussion.user_email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">
                {discussion.user_email || t('Anonymous')}
              </span>
              {isOwnComment && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{t('You')}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {discussion.created_at && format(new Date(discussion.created_at), 'MMM d, HH:mm')}
              </span>
            </div>
            <div className="bg-muted/30 rounded-lg px-2.5 py-1.5 border border-border/50">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {discussion.content}
              </p>
            </div>
            {!discussion.parent_id && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setReplyingTo(discussion.id)}
              >
                <Reply className="h-3 w-3 mr-1" />
                {t('Reply')}
              </Button>
            )}
          </div>
        </div>
        {replies.length > 0 && (
          <div className="space-y-1">
            {replies.map(reply => renderDiscussion(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 animate-fade-in pt-20 px-6 pb-8">
      <div className="grid grid-cols-[280px,1fr] gap-4 flex-1">
        {/* Sidebar */}
        <Card className="h-[600px] flex flex-col">
          <CardContent className="flex flex-col h-full p-4 gap-4">
            {/* Search */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={viewMode === 'stocks' ? t('Search stocks...') : t('Search industries...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(v) => {
              setViewMode(v as 'stocks' | 'industries');
              setSelectedStock(null);
              setSelectedIndustry(null);
              setSearchQuery('');
            }} className="flex-shrink-0">
              <TabsList className="w-full grid grid-cols-2 h-9">
                <TabsTrigger value="stocks" className="text-xs">{t('Stocks')}</TabsTrigger>
                <TabsTrigger value="industries" className="text-xs">{t('Industries')}</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto space-y-0.5 -mx-2 px-2">
              {viewMode === 'stocks' ? (
                filteredStocks.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">{t('No stocks found')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('Go to')} <span className="font-semibold">{t('Home')} → {t('Edit')}</span> {t('to add stocks')}
                    </p>
                  </div>
                ) : (
                  filteredStocks.map((stock, index) => (
                    <Button
                      key={`${stock.symbol}-${stock.id || index}`}
                      variant={selectedStock === stock.symbol ? 'secondary' : 'ghost'}
                      className={cn(
                        "w-full justify-between h-8 text-sm font-medium",
                        selectedStock === stock.symbol && "shadow-sm"
                      )}
                      onClick={() => {
                        setSelectedStock(stock.symbol);
                        setSelectedIndustry(null);
                      }}
                    >
                      <span>{stock.symbol}</span>
                      {discussionCounts.stockCounts[stock.symbol] && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {discussionCounts.stockCounts[stock.symbol]}
                        </Badge>
                      )}
                    </Button>
                  ))
                )
              ) : (
                <>
                  {/* Add Industry Input */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder={t('New industry...')}
                      value={newIndustryName}
                      onChange={(e) => setNewIndustryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addIndustry();
                      }}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3 flex-shrink-0"
                      onClick={addIndustry}
                      disabled={!newIndustryName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Industries List */}
                  {filteredIndustries.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{t('No industries yet')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('Add one to get started')}</p>
                    </div>
                  ) : (
                    filteredIndustries.map((industry) => (
                      <div
                        key={industry.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md transition-colors group",
                          selectedIndustry === industry.id 
                            ? "bg-secondary shadow-sm" 
                            : "hover:bg-muted/50"
                        )}
                      >
                        {editingIndustry === industry.id ? (
                          <>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') updateIndustry(industry.id, editingName);
                                if (e.key === 'Escape') {
                                  setEditingIndustry(null);
                                  setEditingName('');
                                }
                              }}
                              className="h-7 text-sm flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => updateIndustry(industry.id, editingName)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingIndustry(null);
                                setEditingName('');
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <button
                              className="flex-1 text-left text-sm font-medium"
                              onClick={() => {
                                setSelectedIndustry(industry.id);
                                setSelectedStock(null);
                              }}
                            >
                              {industry.name}
                            </button>
                            {discussionCounts.industryCounts[industry.id] && (
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                {discussionCounts.industryCounts[industry.id]}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => {
                                setEditingIndustry(industry.id);
                                setEditingName(industry.name);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                              onClick={() => deleteIndustry(industry.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discussion Area */}
        {(selectedStock || selectedIndustry) ? (
          <Card className="h-[600px] flex flex-col">
            <CardContent className="flex flex-col h-full p-0">
              {/* Discussion List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">{t('Loading...')}</p>
                  </div>
                ) : discussions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('No discussions yet')}</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {t('Be the first to share your thoughts!')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {discussions
                      .filter(d => !d.parent_id)
                      .map(discussion => renderDiscussion(discussion))}
                  </div>
                )}
              </div>

              {/* Comment Input */}
              <div className="border-t p-4 bg-muted/20 flex-shrink-0">
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <Reply className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{t('Replying to comment')}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs ml-auto"
                      onClick={() => setReplyingTo(null)}
                    >
                      {t('Cancel')}
                    </Button>
                  </div>
                )}
                <div className="flex gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border">
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                      {t('You')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder={replyingTo ? t('Write a reply...') : t('Share your thoughts...')}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[70px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          submitComment();
                        }
                      }}
                    />
                    <Button
                      onClick={submitComment}
                      disabled={!newComment.trim() || submitting}
                      size="sm"
                      className="h-10 px-4 flex-shrink-0"
                    >
                      {submitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {t('Send')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-[600px] flex items-center justify-center">
            <CardContent className="text-center p-8">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t('Select a {item} to start', { item: viewMode === 'stocks' ? t('stock') : t('industry') })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('Choose from the list to view and join discussions')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StockChat;
