import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, StickyNote, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/i18n';

export interface MarketNoteResult {
  date: string;
  content: string;
  matchedText: string;
}

export interface StockResult {
  symbol: string;
  date: string;
  type: 'explanation' | 'note';
  content: string;
  matchedText: string;
  companyName?: string;
}

interface SearchResultsProps {
  marketNotes: MarketNoteResult[];
  stockResults: StockResult[];
  searchQuery: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ marketNotes, stockResults, searchQuery }) => {
  const { t } = useI18n();
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightTextInHtml = (html: string, query: string) => {
    if (!query) return html;
    const safeQuery = escapeRegExp(query);
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return html.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const cleanText = stripHtml(text);
    const safeQuery = escapeRegExp(query);
    const parts = cleanText.split(new RegExp(`(${safeQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
        : part
    );
  };

  const groupedStockResults = stockResults.reduce((acc, result) => {
    const key = `${result.symbol}-${result.date}`;
    if (!acc[key]) {
      acc[key] = {
        symbol: result.symbol,
        date: result.date,
        companyName: result.companyName,
        notes: [],
        explanations: []
      };
    }
    if (result.type === 'note') {
      acc[key].notes.push(result);
    } else {
      acc[key].explanations.push(result);
    }
    return acc;
  }, {} as Record<string, { 
    symbol: string; 
    date: string; 
    companyName?: string; 
    notes: StockResult[];
    explanations: StockResult[];
  }>);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold">
          {t('Search Results for "{query}"', { query: searchQuery })}
        </h2>
        <span className="text-xs sm:text-sm text-muted-foreground">
          {t('{count} market notes', { count: marketNotes.length })} · {t('{count} stock notes', { count: stockResults.filter(r => r.type === 'note').length })} · {t('{count} AI explanations', { count: stockResults.filter(r => r.type === 'explanation').length })}
        </span>
      </div>

      {/* Market Notes Results */}
      {marketNotes.length > 0 && (
        <Card className="hover:shadow-md transition-all duration-300 ease-out">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              {t('Market Notes ({count})', { count: marketNotes.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 sm:px-6">
            {marketNotes.map((note, index) => (
              <div key={index} className="border-l-2 border-primary pl-3 py-2 hover:bg-accent/30 rounded-r transition-all duration-200 ease-out">
                <div className="text-xs text-muted-foreground mb-1">
                  {format(new Date(note.date), 'MMM dd, yyyy')}
                </div>
                <div 
                  className="text-xs sm:text-sm prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: highlightTextInHtml(note.matchedText, searchQuery) }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stock Results */}
      {Object.keys(groupedStockResults).length > 0 && (
        <Card className="hover:shadow-md transition-all duration-300 ease-out">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              {t('Stocks ({count})', { count: Object.keys(groupedStockResults).length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-3 sm:px-6">
            {Object.values(groupedStockResults).map((stock, index) => (
              <div key={index} className="border rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 ease-out">
                {/* Stock Header */}
                <div className="bg-muted/30 p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b">
                  <div>
                    <span className="font-bold text-sm sm:text-base text-foreground">{stock.symbol}</span>
                    {stock.companyName && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">{stock.companyName}</span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {format(new Date(stock.date), 'yyyy-MM-dd')}
                  </span>
                </div>

                {/* Stock Notes - Priority Display */}
                {stock.notes.length > 0 && (
                  <div className="p-3 sm:p-4 space-y-2 bg-gradient-to-br from-primary/5 to-primary/10 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote className="h-4 w-4 text-primary" />
                      <span className="text-xs sm:text-sm font-semibold text-primary">{t('My Notes')}</span>
                      <span className="text-[10px] text-muted-foreground">({stock.notes.length})</span>
                    </div>
                    {stock.notes.map((note, noteIndex) => (
                      <div 
                        key={noteIndex} 
                        className="pl-3 sm:pl-4 py-2 border-l-2 border-primary bg-background/60 rounded-r hover:bg-background/80 transition-all duration-200 ease-out"
                      >
                        <div className="text-xs sm:text-sm font-medium text-foreground">
                          {highlightText(note.matchedText, searchQuery)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Separator if both exist */}
                {stock.notes.length > 0 && stock.explanations.length > 0 && (
                  <Separator className="my-0" />
                )}

                {/* AI Explanations - Secondary Display */}
                {stock.explanations.length > 0 && (
                  <div className="p-3 sm:p-4 space-y-2 bg-muted/20 opacity-75 hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground italic">{t('AI Explanation')}</span>
                      <span className="text-[9px] text-muted-foreground/60">({stock.explanations.length})</span>
                    </div>
                    {stock.explanations.map((exp, expIndex) => (
                      <div 
                        key={expIndex} 
                        className="pl-2 sm:pl-3 py-1 border-l border-muted-foreground/30 hover:border-muted-foreground/50 transition-all duration-200 ease-out"
                      >
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {highlightText(exp.matchedText, searchQuery)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {marketNotes.length === 0 && Object.keys(groupedStockResults).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('No matching results found')}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchResults;
