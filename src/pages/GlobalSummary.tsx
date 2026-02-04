import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/PageHeader';
import Navigation from '@/components/Navigation';
import PageSkeleton from '@/components/PageSkeleton';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    User,
    LogOut,
    KeyRound,
    Settings as SettingsIcon,
    MessageCircle
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import FeedbackDialog from "@/components/FeedbackDialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from '@/i18n';

const GlobalSummary = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [changePasswordDialog, setChangePasswordDialog] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [feedbackDialog, setFeedbackDialog] = useState(false);

    useEffect(() => {
        const checkAuthAndRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/auth');
                return;
            }

            if (session.user?.email) {
                setUserEmail(session.user.email);
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .eq('role', 'admin')
                    .single();
                setIsAdmin(!!roleData);
            }
            setLoading(false);
        };

        checkAuthAndRole();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/auth');
        } catch (error) {
            toast({ title: t("Error"), description: t("Failed to logout"), variant: "destructive" });
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword !== confirmNewPassword) {
            toast({ title: t("Error"), description: t("Passwords do not match"), variant: "destructive" });
            return;
        }
        setChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast({ title: t("Success"), description: t("Password updated successfully") });
            setChangePasswordDialog(false);
        } catch (error: any) {
            toast({ title: t("Error"), description: error.message, variant: "destructive" });
        } finally {
            setChangingPassword(false);
        }
    };

    if (loading) return <PageSkeleton />;

    return (
        <div className="min-h-screen bg-background flex flex-col pt-16 h-screen">
            <PageHeader />
            <Navigation activeTab="home" onTabChange={(tab) => navigate('/', { state: { activeTab: tab } })} isAdmin={isAdmin} />

            {/* User Menu - Keeping consistency with Research.tsx */}
            <div className="fixed top-[18px] right-4 z-[60]">
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-accent ring-0 focus-visible:ring-0">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    {userEmail ? userEmail[0].toUpperCase() : <User className="h-5 w-5" />}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 z-[60]" sideOffset={8}>
                        <div className="flex flex-col space-y-1 p-2">
                            <p className="text-sm font-medium">{userEmail || t('User')}</p>
                            {isAdmin && (
                                <p className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded w-fit">
                                    {t('Admin')}
                                </p>
                            )}
                        </div>
                        <DropdownMenuSeparator />
                        {isAdmin && (
                            <DropdownMenuItem onClick={() => navigate('/', { state: { activeTab: 'admin' } })}>
                                <SettingsIcon className="mr-2 h-4 w-4" />
                                <span>{t('User Management')}</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setChangePasswordDialog(true)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            <span>{t('Change Password')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/settings')}>
                            <SettingsIcon className="mr-2 h-4 w-4" />
                            <span>{t('Settings')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{t('Logout')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {!isAdmin && (
                <div className="fixed top-4 right-16 z-[60]">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFeedbackDialog(true)}
                        className="h-10 px-3 gap-2 rounded-full hover:bg-accent"
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs">{t("Feedback")}</span>
                    </Button>
                </div>
            )}

            {/* Embedded Content */}
            <div className="flex-1 w-full overflow-hidden mt-2">
                <iframe
                    src="http://118.193.47.247:8004/"
                    className="w-full h-full border-0"
                    title="Global Summary"
                />
            </div>

            {/* Dialogs */}
            <Dialog open={changePasswordDialog} onOpenChange={setChangePasswordDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{t("Change Password")}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("New Password")}</label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("Confirm New Password")}</label>
                            <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setChangePasswordDialog(false)}>{t("Cancel")}</Button>
                        <Button onClick={handleChangePassword} disabled={changingPassword}>{changingPassword ? t("Changing...") : t("Change Password")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <FeedbackDialog open={feedbackDialog} onOpenChange={setFeedbackDialog} />
        </div>
    );
};

export default GlobalSummary;
