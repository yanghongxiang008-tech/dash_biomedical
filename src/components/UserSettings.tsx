import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Briefcase,
  Building2,
  Users,
  Link2,
  Save,
  Check,
  Loader2
} from 'lucide-react';
import { useI18n } from '@/i18n';
import { Switch } from '@/components/ui/switch';
import { BookOpen } from 'lucide-react';

interface UserSettingsProps {
  userId: string;
}

const UserSettings: React.FC<UserSettingsProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [identity, setIdentity] = useState<string | null>(null);
  const [notionApiKey, setNotionApiKey] = useState('');
  const [showResearchTab, setShowResearchTab] = useState(() => {
    return localStorage.getItem('showResearchTab') === 'true';
  });
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const identityOptions = [
    { id: 'investor', label: t('Investor'), icon: LineChart },
    { id: 'analyst', label: t('Analyst'), icon: Briefcase },
    { id: 'founder', label: t('Founder'), icon: Building2 },
    { id: 'advisor', label: t('Advisor'), icon: Users },
  ];

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, identity, notion_api_key')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setDisplayName(data.display_name || '');
      setIdentity(data.identity || null);
      setNotionApiKey(data.notion_api_key || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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
        title: t("Success"),
        description: t("Settings saved"),
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to save settings"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = () => {
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Display Name */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-1">{t("Display Name")}</h3>
          <p className="text-xs text-muted-foreground">{t("How you'll appear in the app")}</p>
        </div>
        <Input
          value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); handleChange(); }}
          placeholder={t("Your name")}
          className="max-w-sm"
        />
      </div>

      {/* Identity */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-1">{t("Your Role")}</h3>
          <p className="text-xs text-muted-foreground">{t("What best describes you")}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {identityOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => { setIdentity(option.id); handleChange(); }}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${identity === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 hover:border-border hover:bg-muted/30'
                  }`}
              >
                <Icon className={`w-4 h-4 ${identity === option.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">{option.label}</span>
                {identity === option.id && <Check className="w-3 h-3 text-primary ml-auto" />}
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
            {t("Notion Integration")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("Connect to sync analyses to Notion")}</p>
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            value={notionApiKey}
            onChange={(e) => { setNotionApiKey(e.target.value); handleChange(); }}
            placeholder={t("secret_...")}
            className="max-w-sm font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("Get your token from")}{' '}
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

      {/* Display Settings */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div>
          <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {t("Display Settings")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("Customize which tabs appear in navigation")}</p>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="research-toggle" className="text-sm font-medium cursor-pointer">
              {t("Show Research Tab")}
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {t("Enable or disable the Research tab in the main navigation bar")}
            </p>
          </div>
          <Switch
            id="research-toggle"
            checked={showResearchTab}
            onCheckedChange={(checked) => {
              setShowResearchTab(checked);
              localStorage.setItem('showResearchTab', checked.toString());
              // Dispatch custom event to notify Navigation component
              window.dispatchEvent(new Event('toggle-research'));
            }}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-border">
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
          {t("Save Changes")}
        </Button>
      </div>
    </div>
  );
};

export default UserSettings;
