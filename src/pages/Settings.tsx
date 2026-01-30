import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import LanguageToggle from '@/components/LanguageToggle';
import { 
  Building2, 
  LineChart, 
  Briefcase,
  Link2,
  Save,
  Check,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Footer from '@/components/Footer';
import PageSkeleton from '@/components/PageSkeleton';
import PageLayout from '@/components/PageLayout';

const Settings = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [identity, setIdentity] = useState<string | null>(null);
  const [notionApiKey, setNotionApiKey] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [notionStatus, setNotionStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const { toast } = useToast();
  const identityOptions = [
    { 
      id: 'private_equity', 
      label: t('Private Equity'), 
      description: t('Focus on private market investments'),
      icon: Building2 
    },
    { 
      id: 'public_equity', 
      label: t('Public Equity'), 
      description: t('Focus on public market investments'),
      icon: LineChart 
    },
    { 
      id: 'both', 
      label: t('Both'), 
      description: t('Work across private and public markets'),
      icon: Briefcase 
    },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      // Use getSession() which is faster (cached) instead of getUser() which makes a network request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
      await fetchProfile(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, identity, notion_api_key')
        .eq('id', id)
        .single();

      if (error) throw error;

      setDisplayName(data.display_name || '');
      setIdentity(data.identity || null);
      setNotionApiKey(data.notion_api_key || '');
      
      // Check Notion connection if key exists
      if (data.notion_api_key) {
        checkNotionConnection(data.notion_api_key);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotionConnection = async (apiKey: string) => {
    // Support both old 'secret_' and new 'ntn_' format
    if (!apiKey || (!apiKey.startsWith('secret_') && !apiKey.startsWith('ntn_'))) {
      setNotionStatus('idle');
      return;
    }
    
    setNotionStatus('checking');
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-notion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ apiKey }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotionStatus('valid');
      } else {
        setNotionStatus('invalid');
      }
    } catch (error) {
      console.error('Notion connection check failed:', error);
      setNotionStatus('invalid');
    }
  };

  const handleNotionKeyChange = (value: string) => {
    setNotionApiKey(value);
    setHasChanges(true);
    setNotionStatus('idle');
  };

  const handleCheckNotion = () => {
    if (notionApiKey) {
      checkNotionConnection(notionApiKey);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          identity: identity,
          notion_api_key: notionApiKey || null,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Settings saved'),
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: t('Error'),
        description: error.message || t('Failed to save settings'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <PageSkeleton containerClassName="max-w-2xl" />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <PageLayout
          maxWidth="full"
          paddingTop="pt-16 sm:pt-24"
          paddingBottom="pb-12"
          paddingX="px-4 md:px-6 lg:px-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-heading tracking-tight">{t('Settings')}</h1>
              <p className="text-sm text-muted-foreground">{t('Manage your profile and integrations')}</p>
            </div>
            <LanguageToggle className="ml-auto" size="sm" />
          </div>

          <div className="space-y-10">
            {/* Display Name */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">{t('Display Name')}</h3>
                <p className="text-xs text-muted-foreground">{t("How you'll appear in the app")}</p>
              </div>
              <Input
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setHasChanges(true); }}
                placeholder={t('Your name')}
                className="max-w-sm"
              />
            </div>

            {/* Identity */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">{t('Your Role')}</h3>
                <p className="text-xs text-muted-foreground">{t('What best describes you')}</p>
              </div>
              <div className="space-y-3">
                {identityOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => { setIdentity(option.id); setHasChanges(true); }}
                      className={`relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                        identity === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border/50 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        identity === option.id
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground group-hover:text-foreground'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                      </div>
                      {identity === option.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notion Integration */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  {t('Notion Integration')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('Connect to sync analyses to Notion and enable AI features')}</p>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={notionApiKey}
                    onChange={(e) => handleNotionKeyChange(e.target.value)}
                    placeholder="ntn_... or secret_..."
                    className="max-w-sm font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleCheckNotion}
                    disabled={!notionApiKey || notionStatus === 'checking'}
                  >
                    {notionStatus === 'checking' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t('Test')
                    )}
                  </Button>
                </div>
                
                {/* Connection Status */}
                {notionStatus === 'valid' && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('Connected successfully')}</span>
                  </div>
                )}
                {notionStatus === 'invalid' && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span>{t('Connection failed - please check your API key')}</span>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {t('Get your token from')}{' '}
                  <a 
                    href="https://www.notion.so/my-integrations" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Notion Integrations
                  </a>
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-border">
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('Save Changes')}
              </Button>
            </div>
          </div>
        </PageLayout>
      </div>
      <Footer />
    </div>
  );
};

export default Settings;
