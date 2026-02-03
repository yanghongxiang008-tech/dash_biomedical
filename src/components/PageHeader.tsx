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
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
          AI
        </div>
        <h1 className="text-lg font-normal text-foreground tracking-tight font-heading">
          Biomedical
        </h1>
      </div>

      {/* Market Switcher - Hidden */}
    </div>
  );
};

export default PageHeader;
