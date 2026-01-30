import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className }) => (
  <div className={cn("rounded-2xl bg-muted/30 animate-pulse", className)}>
    <div className="p-5">
      <div className="flex items-start gap-3.5 mb-3">
        <div className="w-11 h-11 rounded-xl bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 bg-muted/60 rounded" />
          <div className="h-3 w-1/3 bg-muted/40 rounded" />
        </div>
      </div>
      <div className="pt-3 border-t border-border/30 space-y-2">
        <div className="h-3 w-full bg-muted/40 rounded" />
        <div className="h-3 w-2/3 bg-muted/40 rounded" />
      </div>
    </div>
  </div>
);

interface SkeletonRowProps {
  className?: string;
}

export const SkeletonRow: React.FC<SkeletonRowProps> = ({ className }) => (
  <div className={cn("flex items-center gap-3 p-3 animate-pulse", className)}>
    <div className="w-8 h-8 rounded-lg bg-muted/60" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3.5 w-1/3 bg-muted/60 rounded" />
      <div className="h-2.5 w-1/2 bg-muted/40 rounded" />
    </div>
    <div className="h-5 w-16 bg-muted/40 rounded-full" />
  </div>
);

interface SkeletonGridProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ 
  count = 6, 
  columns = 3,
  className 
}) => {
  const gridClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };
  
  return (
    <div className={cn("grid gap-4", gridClasses[columns], className)}>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} className="h-40" />
      ))}
    </div>
  );
};

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ 
  count = 5,
  className 
}) => (
  <div className={cn("space-y-2", className)}>
    {[...Array(count)].map((_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
);

export default SkeletonGrid;
