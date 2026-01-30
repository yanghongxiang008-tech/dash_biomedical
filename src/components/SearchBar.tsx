import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onClear, isSearching, className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useI18n();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    onClear();
  };

  return (
    <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('Search...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
            if (e.key === 'Escape') handleClear();
          }}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSearch} disabled={!searchQuery.trim()} size="sm" className="flex-1 sm:flex-initial">
          {t('Search')}
        </Button>
        {isSearching && (
          <Button onClick={handleClear} variant="outline" size="sm" className="flex-1 sm:flex-initial">
            {t('Close')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
