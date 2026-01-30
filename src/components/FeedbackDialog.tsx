import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackDialog = ({ open, onOpenChange }: FeedbackDialogProps) => {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: t("Error"),
        description: t("Please enter your feedback"),
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: t("Error"),
          description: t("You must be logged in to submit feedback"),
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          content: feedback.trim()
        });

      if (error) throw error;

      toast({
        title: t("Success"),
        description: t("Thank you for your feedback!")
      });

      setFeedback('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: t("Error"),
        description: error.message || t("Failed to submit feedback"),
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("Send Feedback")}</DialogTitle>
          <DialogDescription>
            {t("Share your thoughts, suggestions, or report issues. We appreciate your feedback!")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("Tell us what you think...")}
            className="min-h-[120px] resize-none"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFeedback('');
            }}
          >
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("Submitting...") : t("Submit Feedback")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
