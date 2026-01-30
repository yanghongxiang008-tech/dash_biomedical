import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, KeyRound, Mail, Loader2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  role?: 'admin' | 'user' | null;
}

interface UserRole {
  role: 'admin' | 'user';
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; userId: string; email: string }>({
    open: false,
    userId: '',
    email: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles = (profilesData || []).map(profile => {
        const userRole = rolesData?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = async (userId: string): Promise<'admin' | 'user' | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }

      return data?.role || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingInvite(true);
      const { error } = await supabase.functions.invoke('send-invite-email', {
        body: { email: inviteEmail, role: 'user' },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail('');
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete User',
      description: `Are you sure you want to delete user "${email}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.functions.invoke('manage-user', {
            body: { action: 'delete', userId },
          });

          if (error) throw error;

          toast({
            title: 'Success',
            description: 'User deleted successfully',
          });
          fetchUsers();
        } catch (error: any) {
          console.error('Error deleting user:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to delete user',
            variant: 'destructive',
          });
        }
      },
    });
  };

  const resetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    try {
      setResettingPassword(true);
      const { error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'reset-password',
          userId: resetPasswordDialog.userId,
          newPassword,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Password reset for ${resetPasswordDialog.email}`,
      });
      setResetPasswordDialog({ open: false, userId: '', email: '' });
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>

      {/* Invite User Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite User
          </CardTitle>
          <CardDescription>Send an invitation email to a new user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendInvite();
              }}
              className="flex-1"
            />
            <Button onClick={sendInvite} disabled={sendingInvite} className="whitespace-nowrap">
              {sendingInvite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>Manage existing users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        {user.role ? (
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No role</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setResetPasswordDialog({
                                open: true,
                                userId: user.id,
                                email: user.email,
                              })
                            }
                          >
                            <KeyRound className="h-4 w-4 mr-1" />
                            Reset Password
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUser(user.id, user.email)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => !open && setResetPasswordDialog({ open: false, userId: '', email: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordDialog.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') resetPassword();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialog({ open: false, userId: '', email: '' });
                setNewPassword('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={resetPassword} disabled={resettingPassword}>
              {resettingPassword ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default UserManagement;
