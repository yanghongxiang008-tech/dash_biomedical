import React from 'react';
import { cn } from '@/lib/utils';

interface PageSectionHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

const PageSectionHeader = ({
  title,
  subtitle,
  actions,
  className,
  titleClassName,
  subtitleClassName,
}: PageSectionHeaderProps) => {
  return (
    <div
      className={cn(
        "mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        className
      )}
    >
      <div>
        <h1 className={cn("text-lg sm:text-xl font-medium tracking-tight text-foreground", titleClassName)}>
          {title}
        </h1>
        {subtitle ? (
          <p className={cn("text-xs text-muted-foreground mt-0.5", subtitleClassName)}>{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div> : null}
    </div>
  );
};

export default PageSectionHeader;
