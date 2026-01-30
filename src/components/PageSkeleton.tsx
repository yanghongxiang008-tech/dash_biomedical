import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  rows?: number;
  containerClassName?: string;
  className?: string;
}

const PageSkeleton = ({ rows = 6, containerClassName, className }: PageSkeletonProps) => {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className={cn("mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-24", containerClassName || "max-w-7xl")}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/50 bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
