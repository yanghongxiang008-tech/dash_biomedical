import React from 'react';
import { cn } from '@/lib/utils';

type MaxWidth = '2xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

const MAX_WIDTH_CLASSES: Record<Exclude<MaxWidth, 'full'>, string> = {
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl'
};

interface PageLayoutProps {
  header?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: MaxWidth;
  paddingTop?: string;
  paddingBottom?: string;
  paddingX?: string;
  className?: string;
}

const PageLayout = ({
  header,
  children,
  maxWidth = '7xl',
  paddingTop = 'pt-16 sm:pt-24',
  paddingBottom = 'pb-24 sm:pb-6',
  paddingX = 'px-4 sm:px-6',
  className
}: PageLayoutProps) => {
  const widthClass = maxWidth === 'full' ? '' : MAX_WIDTH_CLASSES[maxWidth];

  return (
    <div
      className={cn(
        maxWidth !== 'full' && 'mx-auto',
        widthClass,
        paddingTop,
        paddingBottom,
        paddingX,
        className
      )}
    >
      {header}
      {children}
    </div>
  );
};

export default PageLayout;
