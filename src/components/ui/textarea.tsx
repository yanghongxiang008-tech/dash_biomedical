import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "flex w-full rounded-md bg-muted/50 border-0 text-sm transition-colors duration-200 placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "hover:bg-muted/70 focus-visible:bg-muted/70",
        ghost: "bg-transparent hover:bg-muted/50 focus-visible:bg-muted/50",
        outline: "bg-transparent border border-border hover:bg-muted/30 focus-visible:bg-muted/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          textareaVariants({ variant }),
          "min-h-[80px] px-3 py-2 resize-none",
          error && "bg-destructive/10 focus-visible:bg-destructive/15",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
