/**
 * Recent projects section for dashboard
 * Responsive layout: 1 project = full width, 2 = split, max 3 per row
 * Enhanced empty state with guidance
 */

import React from 'react';
import { FolderKanban, ArrowRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Deal } from '@/types';
import { getInitials } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface RecentProjectsProps {
  projects: Deal[];
  onProjectClick: (dealId: string) => void;
}

export const RecentProjects: React.FC<RecentProjectsProps> = ({
  projects,
  onProjectClick,
}) => {
  const { t } = useI18n();
  const displayProjects = projects.slice(0, 6);
  const count = displayProjects.length;
  
  // Dynamic grid classes based on project count
  const getGridClass = () => {
    if (count === 0) return '';
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          {t('New Projects')}
        </h3>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {projects.length}
        </span>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-muted/20 border border-dashed border-border/50">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t('No new projects this week')}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1 text-center">
            {t('Add a project in Pipeline to see it here')}
          </p>
        </div>
      ) : (
        <div className={cn("grid gap-3", getGridClass())}>
          {displayProjects.map((project) => (
            <div
              key={project.id}
              className="group flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all"
              onClick={() => onProjectClick(project.id)}
            >
              <Avatar className="h-11 w-11 rounded-xl flex-shrink-0">
                <AvatarImage src={project.logo_url || ''} alt={project.project_name} />
                <AvatarFallback className="rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                  {getInitials(project.project_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {project.project_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {project.status && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted">
                      {project.status}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(project.created_at), 'MMM d')}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
