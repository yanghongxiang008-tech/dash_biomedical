import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n';

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: {
    title: string;
    url?: string;
    summary?: string;
  }) => Promise<any>;
}

export const AddItemDialog: React.FC<AddItemDialogProps> = ({
  open,
  onOpenChange,
  onAdd
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const result = await onAdd({
        title: title.trim(),
        url: url.trim() || undefined,
        summary: summary.trim() || undefined
      });

      if (result) {
        setTitle('');
        setUrl('');
        setSummary('');
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <DialogTitle>{t('Add Article Manually')}</DialogTitle>
          <DialogDescription>
            {t('Record an article from a paid or login-required source.')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('Title')} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('Article title')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">{t('URL (optional)')}</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">{t('Summary / Key Points (optional)')}</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t('Brief summary or key takeaways...')}
                rows={4}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Add Article')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
