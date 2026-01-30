import React from 'react';
import { cn } from '@/lib/utils';

// Status configurations using semantic design tokens
const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  // Deal statuses
  'Invested': { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  'Pass': { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  'Reject': { bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive' },
  'Follow': { bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  'Due Diligence': { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  'DD': { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  // Generic statuses
  'Active': { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  'Inactive': { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  'Pending': { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
};

// Default fallback
const defaultStyle = { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' };

interface StatusBadgeProps {
  status: string | null | undefined;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showDot = true,
  size = 'sm',
  className,
}) => {
  if (!status) return null;
  
  const styles = statusStyles[status] || defaultStyle;
  
  return (
    <span
      className={cn(
        "rounded-full font-medium inline-flex items-center gap-1.5",
        styles.bg,
        styles.text,
        size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      {showDot && (
        <span className={cn("rounded-full", styles.dot, size === 'sm' ? "w-1.5 h-1.5" : "w-2 h-2")} />
      )}
      {status}
    </span>
  );
};

export default StatusBadge;
