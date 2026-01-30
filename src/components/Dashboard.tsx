/**
 * Dashboard component - refactored to use modular sub-components
 */

import React from 'react';
import { Users, FolderKanban, RefreshCcw } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { RecentContacts } from '@/components/dashboard/RecentContacts';
import { RecentInteractions } from '@/components/dashboard/RecentInteractions';
import { NotableDeals } from '@/components/dashboard/NotableDeals';
import { 
  useDashboardStats, 
  useDashboardActivity, 
  useDashboardNotableDeals,
  formatLastUpdated
} from '@/hooks/useDashboard';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import PageSectionHeader from '@/components/PageSectionHeader';
import { useI18n } from '@/i18n';

interface DashboardProps {
  userName: string;
  onNavigateToTab: (tab: 'projects' | 'access', options?: { dealId?: string; contactId?: string }) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userName, onNavigateToTab }) => {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useDashboardActivity();
  const { data: notableData } = useDashboardNotableDeals();

  const displayName = userName?.split('@')[0] || t('User');

  const handleDealClick = (dealId: string) => {
    onNavigateToTab('projects', { dealId });
  };

  const handleContactClick = (contactId: string) => {
    onNavigateToTab('access', { contactId });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ predicate: (query) => 
      (query.queryKey[0] as string)?.startsWith?.('dashboard-') || false
    });
  };

  return (
    <div className="space-y-6">
      <PageSectionHeader
        title={t('Dashboard')}
        subtitle={t('Welcome Back, {name}', { name: displayName })}
        actions={(
          <>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {t('Updated {time}', { time: formatLastUpdated(stats.lastUpdated) })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={statsLoading || activityLoading}
           >
              <RefreshCcw className={`h-3.5 w-3.5 ${statsLoading || activityLoading ? 'animate-spin' : ''}`} />
            </Button>
          </>
        )}
      />

      {/* Summary Stats with Week Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title={t('Total Contacts')}
          value={stats.contactsCount}
          growth={stats.contactsGrowth}
          weekComparison={{
            thisWeek: stats.thisWeekContacts,
            lastWeek: stats.lastWeekNewContacts,
            percentChange: stats.contactsPercentChange,
          }}
          icon={Users}
          onClick={() => onNavigateToTab('access')}
        />
        <StatCard
          title={t('Active Deals')}
          value={stats.activeDealsCount}
          growth={stats.dealsGrowth}
          weekComparison={{
            thisWeek: stats.thisWeekDeals,
            lastWeek: stats.lastWeekNewDeals,
            percentChange: stats.dealsPercentChange,
          }}
          icon={FolderKanban}
          onClick={() => onNavigateToTab('projects')}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 py-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Recent Highlights Section */}
      <div className="space-y-8">
        {/* Projects */}
        <RecentProjects 
          projects={activity.recentProjects} 
          onProjectClick={handleDealClick} 
        />

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Contacts */}
        <RecentContacts 
          contacts={activity.recentContacts} 
          onContactClick={handleContactClick} 
        />

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Interactions */}
        <RecentInteractions 
          interactions={activity.recentInteractions} 
          onContactClick={handleContactClick} 
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 py-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Notable Deals */}
      <NotableDeals
        deals={notableData.notableDeals}
        dealInteractions={notableData.dealInteractions}
        onDealClick={handleDealClick}
        onContactClick={handleContactClick}
      />
    </div>
  );
};

export default Dashboard;
