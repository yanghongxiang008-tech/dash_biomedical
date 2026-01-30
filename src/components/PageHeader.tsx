import React from 'react';
// import MarketSwitcher, { MarketType } from './MarketSwitcher';

interface PageHeaderProps {
  // currentMarket: MarketType;
  // onMarketChange: (market: MarketType) => void;
  pageTitle?: string;
  pageSubtitle?: string;
}

const PageHeader = ({ pageTitle, pageSubtitle }: PageHeaderProps) => {
  return (
    <div className="fixed top-[14px] left-4 z-50 flex items-center gap-2">
      {/* AI/Tech Daily Brand with Logo */}
      <div className="flex items-center gap-1.5">
        <img 
          src="/favicon.png" 
          alt="AI/Tech Daily Logo" 
          className="w-6 h-6"
        />
        <h1 className="text-lg font-normal text-foreground tracking-tight font-heading">
          AI/Tech Daily
        </h1>
      </div>
      
      {/* Market Switcher - Hidden */}
    </div>
  );
};

export default PageHeader;
