import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import LanguageToggle from '@/components/LanguageToggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Briefcase, 
  LineChart, 
  Building2, 
  ChevronRight, 
  ChevronLeft,
  Link2,
  Upload,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

// Notion step with validation
const NotionStep = ({ 
  notionApiKey, 
  setNotionApiKey,
  notionStatus,
  onCheck
}: { 
  notionApiKey: string; 
  setNotionApiKey: (val: string) => void;
  notionStatus: 'idle' | 'checking' | 'valid' | 'invalid';
  onCheck: () => void;
}) => {
  const { t } = useI18n();
  return (
  <div className="space-y-6 animate-fade-in">
    <div className="text-left mb-6">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Link2 className="w-6 h-6 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-medium mb-2" >
        {t('Connect to Notion')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('Optional: Sync your analyses to Notion and enable AI features')}
      </p>
    </div>

    {/* Setup Instructions */}
    <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-xs">
      <p className="font-medium text-sm text-foreground">{t('Setup Steps:')}</p>
      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
        <li>
          {t('Go to')}
          <a 
            href="https://www.notion.so/my-integrations" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
         >
            Notion Integrations
          </a>
          {t('and create a new integration')}
        </li>
        <li>
          {t('Copy the')}{' '}
          <span className="font-mono bg-muted px-1 rounded">Internal Integration Token</span>
        </li>
        <li>
          <span className="text-foreground font-medium">{t('Important:')}</span>{' '}
          {t('In Notion, go to')}{' '}
          <span className="font-mono bg-muted px-1 rounded">Settings → Connections</span>,{' '}
          {t('find your integration and connect it')}
        </li>
        <li>
          {t('Open the pages you want to link with AI/Tech Daily, click')}{' '}
          <span className="font-mono bg-muted px-1 rounded">···</span> → 
          <span className="font-mono bg-muted px-1 rounded">Connect to</span> → {t('select your integration')}
        </li>
      </ol>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">{t('Notion Integration Token')}</Label>
        <div className="flex gap-2">
          <Input
            type="password"
            value={notionApiKey}
            onChange={(e) => setNotionApiKey(e.target.value)}
            placeholder="ntn_... or secret_..."
            className="bg-background/50 border-border/50"
          />
          <Button 
            variant="outline" 
            onClick={onCheck}
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
      </div>
    </div>
  </div>
  );
};

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [notionApiKey, setNotionApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [notionStatus, setNotionStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [showSkipDialog, setShowSkipDialog] = useState(false);
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

  const totalSteps = 4; // Identity, Notion, Import (skip), Complete

  const checkNotionConnection = async () => {
    // Support both old 'secret_' and new 'ntn_' format
    if (!notionApiKey || (!notionApiKey.startsWith('secret_') && !notionApiKey.startsWith('ntn_'))) {
      setNotionStatus('idle');
      return;
    }
    
    setNotionStatus('checking');
    try {
      // Use edge function to avoid CORS issues
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-notion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ apiKey: notionApiKey }),
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

  // Check if Continue should be disabled for Notion step
  const isNotionContinueDisabled = () => {
    if (step !== 1) return false;
    // Must have API key AND it must be validated to continue
    return notionStatus !== 'valid';
  };

  const handleNext = () => {
    if (step === 0 && !selectedIdentity) {
      toast({
        title: t('Error'),
        description: t('Please select an identity'),
        variant: "destructive",
      });
      return;
    }
    if (step === 1 && notionApiKey && notionStatus !== 'valid') {
      toast({
        title: t('Error'),
        description: t('Please test your Notion connection first'),
        variant: "destructive",
      });
      return;
    }
    setStep(prev => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          identity: selectedIdentity,
          notion_api_key: notionApiKey || null,
          onboarding_completed: true,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Setup complete!'),
      });
      onComplete();
    } catch (error: any) {
      toast({
        title: t('Error'),
        description: error.message || t('Failed to complete setup'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipConfirm = () => {
    setShowSkipDialog(false);
    // Just skip to next step, don't complete onboarding
    setStep(prev => Math.min(prev + 1, totalSteps - 1));
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen p-6 max-w-2xl mx-auto">
        {/* Logo and branding */}
        <div className="mb-12 mt-20 text-left">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="AI/Tech Daily" className="w-12 h-12" />
              <h1 className="text-3xl tracking-tight font-normal" >AI/Tech Daily</h1>
            </div>
            <LanguageToggle size="sm" />
          </div>
          <p className="text-muted-foreground text-sm">{t("Let's get you set up")}</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step 
                  ? 'bg-primary w-8' 
                  : 'bg-muted w-4'
              }`}
            />
          ))}
        </div>
        
        <div className="flex-1 flex flex-col justify-center">

        {/* Card container */}
        <div className="w-full">
          <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-8 transition-all duration-500">
            
            {/* Step 0: Identity Selection */}
            {step === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-left mb-8">
                  <h2 className="text-xl font-medium mb-2" >
                    {t('What best describes you?')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('This helps us tailor your experience')}
                  </p>
                </div>

                <div className="space-y-3">
                  {identityOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedIdentity(option.id)}
                        className={`relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                          selectedIdentity === option.id
                            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                            : 'border-border/50 hover:border-border hover:bg-muted/30'
                        }`}
                     >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          selectedIdentity === option.id
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground group-hover:text-foreground'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                        </div>
                        {selectedIdentity === option.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 1: Notion Integration */}
            {step === 1 && (
              <NotionStep 
                notionApiKey={notionApiKey}
                setNotionApiKey={setNotionApiKey}
                notionStatus={notionStatus}
                onCheck={checkNotionConnection}
              />
            )}

            {/* Step 2: Bulk Import (Skip) */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-left mb-8">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-medium mb-2" >
                    {t('Import Projects')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('Bulk import your existing deal flow data')}
                  </p>
                </div>

                <div className="p-6 rounded-xl border-2 border-dashed border-border/50 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('This feature is coming soon. You can add projects manually after setup.')}
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('Upload CSV')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Complete */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-medium mb-2" >
                  {t("You're all set!")}
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  {t('Start tracking your deal flow and building your network')}
                </p>

                <div className="space-y-3 text-left bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{t('Identity: {identity}', { identity: identityOptions.find(o => o.id === selectedIdentity)?.label || '' })}</span>
                  </div>
                  {notionApiKey && notionStatus === 'valid' && (
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm">{t('Notion connected')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
              {step > 0 ? (
                <Button variant="ghost" onClick={handleBack} disabled={loading}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('Back')}
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {step < totalSteps - 1 && step > 0 && (
                  <Button variant="ghost" onClick={() => setShowSkipDialog(true)} disabled={loading}>
                    {t('Skip')}
                  </Button>
                )}
                
                {step < totalSteps - 1 ? (
                  <Button onClick={handleNext} disabled={loading || isNotionContinueDisabled()}>
                    {t('Continue')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleComplete} disabled={loading}>
                    {loading ? t('Setting up...') : t('Enter AI/Tech Daily')}
                    <Sparkles className="w-4 h-4 ml-2" />
                  </Button>
                )}
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>Skip Setup?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t('Setting up integrations like Notion enables powerful features including AI-assisted analysis and seamless data sync.')}
            </p>
            <p className="text-muted-foreground">
              {t('You can always configure these later in')}{' '}
              <span className="font-medium text-foreground">{t('Settings')}</span>.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('Continue Setup')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSkipConfirm}>
            {t('Skip for Now')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OnboardingWizard;
