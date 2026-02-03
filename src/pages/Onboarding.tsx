import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import OnboardingWizard from '@/components/OnboardingWizard';
import { useEntryAnimation } from '@/App';
import PageSkeleton from '@/components/PageSkeleton';

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryAnimation = useEntryAnimation();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Preview mode - skip auth check for testing
  const isPreview = searchParams.get('preview') === 'true';

  useEffect(() => {
    if (isPreview) {
      setUserId('preview-user');
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if onboarding is already completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        navigate('/');
        return;
      }

      setUserId(user.id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate, isPreview]);

  const handleComplete = () => {
    if (isPreview) {
      // In preview mode, just trigger animation then stay on page
      entryAnimation?.triggerEntryAnimation();
      return;
    }

    // Trigger entry animation first
    if (entryAnimation) {
      entryAnimation.triggerEntryAnimation();
    } else {
      // If no animation context, navigate directly
      navigate('/');
    }
  };

  if (loading) {
    return <PageSkeleton containerClassName="max-w-xl" rows={3} />;
  }

  if (!userId) return null;

  return <OnboardingWizard userId={userId} onComplete={handleComplete} />;
};

export default Onboarding;
