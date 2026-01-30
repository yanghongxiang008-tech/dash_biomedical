import React from 'react';
import { cn } from '@/lib/utils';

// Semantic priority colors using design tokens
const priorityStyles: Record<number, { bg: string; text: string }> = {
  5: { bg: 'bg-destructive/10', text: 'text-destructive' },
  4: { bg: 'bg-warning/10', text: 'text-warning' },
  3: { bg: 'bg-warning/10', text: 'text-warning' },
  2: { bg: 'bg-primary/10', text: 'text-primary' },
  1: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

interface PriorityBadgeProps {
  priority: number | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'sm',
  className,
}) => {
  if (!priority || priority < 1) return null;
  
  const styles = priorityStyles[priority] || priorityStyles[1];
  
  return (
    <span
      className={cn(
        "rounded font-medium inline-flex items-center justify-center",
        styles.bg,
        styles.text,
        size === 'sm' ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className
      )}
    >
      P{priority}
    </span>
  );
};

export default PriorityBadge;
