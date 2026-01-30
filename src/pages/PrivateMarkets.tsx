/**
 * Private Markets page - main dashboard for private market users
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PrivateNavigation from '@/components/PrivateNavigation';
import PageHeader from '@/components/PageHeader';
import AIChatEnhanced from '@/components/AIChatEnhanced';
import Dashboard from '@/components/Dashboard';
import DealFlowTracker from '@/components/deals/DealFlowTracker';
import DealAnalysis from '@/components/deals/DealAnalysis';
import AccessView from '@/components/AccessView';
import Footer from '@/components/Footer';
import PageSectionHeader from '@/components/PageSectionHeader';
import PageSkeleton from '@/components/PageSkeleton';
import PageLayout from '@/components/PageLayout';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { LogOut, KeyRound, MessageCircle, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";

const PrivateMarkets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'projects' | 'access' | 'analysis'>('home');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [initialDealId, setInitialDealId] = useState<string | null>(null);
  const [initialContactId, setInitialContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle navigation state for opening specific deal or contact
  useEffect(() => {
    const state = location.state as { openDealId?: string; openContactId?: string; activeTab?: string } | null;
    if (state?.openDealId) {
      setActiveTab('projects');
      setInitialDealId(state.openDealId);
    }
    if (state?.openContactId) {
      setActiveTab('access');
      setInitialContactId(state.openContactId);
    }
    if (state?.activeTab) {
      setActiveTab(state.activeTab as any);
    }
    if (state?.openDealId || state?.openContactId || state?.activeTab) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const checkUser = async () => {
      // Use getSession() which is faster (cached) instead of getUser() which makes a network request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      
      const user = session.user;
      
      // Fetch profile for display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      setUserId(user.id);
      setUserEmail(user.email || '');
      setDisplayName(profile?.display_name || '');
      setLoading(false);
    };
    
    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast({ title: t("Error"), description: t("Please fill in all password fields"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: t("Error"), description: t("New passwords do not match"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t("Error"), description: t("New password must be at least 6 characters"), variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: t("Success"), description: t("Password changed successfully") });
      setChangePasswordDialog(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast({ title: t("Error"), description: error.message || t("Failed to change password"), variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleMarketChange = (market: 'public' | 'private') => {
    if (market === 'public') navigate('/');
  };

  const handleDashboardNavigate = (tab: 'projects' | 'access', options?: { dealId?: string; contactId?: string }) => {
    if (options?.dealId) setInitialDealId(options.dealId);
    if (options?.contactId) setInitialContactId(options.contactId);
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div>
            <PageSectionHeader title={t("Cortex")} subtitle={t("Feed the edge")} />
            <AIChatEnhanced />
          </div>
        );
      case 'dashboard':
        return <Dashboard userName={displayName || userEmail} onNavigateToTab={handleDashboardNavigate} />;
      case 'projects':
        return <DealFlowTracker initialDealId={initialDealId} onDealOpened={() => setInitialDealId(null)} />;
      case 'access':
        return <AccessView initialContactId={initialContactId} onContactOpened={() => setInitialContactId(null)} />;
      case 'analysis':
        return <DealAnalysis />;
      default:
        return <AIChatEnhanced />;
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  // Check if mobile for layout adjustments
  const isMobileLayout = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />

      <div className="fixed top-[12px] right-4 z-50 flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(displayName || userEmail)?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {displayName || userEmail}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setChangePasswordDialog(true)} className="cursor-pointer">
              <KeyRound className="h-4 w-4 mr-2" />
              {t("Change Password")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFeedbackDialog(true)} className="cursor-pointer">
              <MessageCircle className="h-4 w-4 mr-2" />
              {t("Feedback")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              {t("Settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              {t("Logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PrivateNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Adjust padding: top for desktop nav, bottom for mobile nav */}
      <PageLayout
        maxWidth="full"
        paddingTop="pt-16 sm:pt-24"
        paddingBottom="pb-24 sm:pb-8"
        paddingX="px-4 md:px-6 lg:px-8"
      >
        {renderContent()}
      </PageLayout>

      <Footer className="hidden sm:block" />

      <FeedbackDialog open={feedbackDialog} onOpenChange={setFeedbackDialog} />
      
      <Dialog open={changePasswordDialog} onOpenChange={setChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Change Password")}</DialogTitle>
            <DialogDescription>{t("Enter your new password below.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("New Password")}</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("Enter new password")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Confirm New Password")}</label>
              <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder={t("Confirm new password")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordDialog(false)}>{t("Cancel")}</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? t("Changing...") : t("Change Password")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivateMarkets;
