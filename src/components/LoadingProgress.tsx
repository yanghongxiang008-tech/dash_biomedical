import React from 'react';
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n";

interface LoadingProgressProps {
  progress: number;
  status: string;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ progress, status }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-5 sm:space-y-6 animate-fade-in px-4">
      <div className="text-center space-y-3">
        {/* Elegant animated loader */}
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div 
            className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"
            style={{ animationDuration: '1s' }}
          />
          <div 
            className="absolute inset-1 rounded-full border-2 border-t-transparent border-r-primary/50 border-b-transparent border-l-transparent animate-spin"
            style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
          />
        </div>
        <h3 className="text-sm font-medium text-foreground mt-4">{t("Loading Data")}</h3>
        <p className="text-xs text-muted-foreground max-w-sm">{status}</p>
      </div>
      
      <div className="w-full max-w-xs space-y-2">
        <Progress 
          value={progress} 
          className="h-1.5 bg-muted/50" 
        />
        <div className="text-[10px] text-center text-muted-foreground/70">
          {progress.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default LoadingProgress;
