import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        compact ? "py-8" : "py-12 sm:py-16",
        className
      )}
    >
      {Icon && (
        <div 
          className={cn(
            "rounded-full bg-muted/50 flex items-center justify-center mb-4",
            compact ? "w-12 h-12" : "w-16 h-16"
          )}
        >
          <Icon className={cn(
            "text-muted-foreground",
            compact ? "h-6 w-6" : "h-8 w-8"
          )} />
        </div>
      )}
      <h3 className={cn(
        "font-medium text-foreground",
        compact ? "text-base mb-1" : "text-lg mb-2"
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          "text-muted-foreground max-w-sm mx-auto",
          compact ? "text-xs mb-3" : "text-sm mb-4"
        )}>
          {description}
        </p>
      )}
      {action && (
        <Button 
          onClick={action.onClick} 
          size={compact ? "sm" : "default"}
          className="gap-1.5"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
