import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResearchSource, SourceCategory, SourceType } from '@/hooks/useResearch';
import { Loader2, X } from 'lucide-react';
import { LogoUploadSection } from './AddSourceDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

interface EditSourceDialogProps {
  source: ResearchSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<ResearchSource>) => void;
}

const priorityLabels: Record<number, string> = {
  1: 'Low',
  2: 'Below Avg',
  3: 'Average',
  4: 'High',
  5: 'Critical'
};

export const EditSourceDialog: React.FC<EditSourceDialogProps> = ({
  source,
  open,
  onOpenChange,
  onSave
}) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(source.name);
  const [url, setUrl] = useState(source.url);
  const [feedUrl, setFeedUrl] = useState(source.feed_url || '');
  const [category, setCategory] = useState<SourceCategory>(source.category as SourceCategory);
  const [sourceType, setSourceType] = useState<SourceType>(source.source_type as SourceType);
  const [description, setDescription] = useState(source.description || '');
  const [tags, setTags] = useState<string[]>(source.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState(source.priority || 3);
  const [logoUrl, setLogoUrl] = useState(source.logo_url || '');
  const [logoPreview, setLogoPreview] = useState<string | null>(source.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  // Reset form when source changes
  useEffect(() => {
    setName(source.name);
    setUrl(source.url);
    setFeedUrl(source.feed_url || '');
    setCategory(source.category as SourceCategory);
    setSourceType(source.source_type as SourceType);
    setDescription(source.description || '');
    setTags(source.tags || []);
    setTagInput('');
    setPriority(source.priority || 3);
    setLogoUrl(source.logo_url || '');
    setLogoPreview(source.logo_url || null);
  }, [source]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags(prev => [...prev, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('research-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('research-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          setUploadingLogo(true);
          const reader = new FileReader();
          reader.onload = (e) => setLogoPreview(e.target?.result as string);
          reader.readAsDataURL(file);
          
          const uploadedUrl = await uploadLogo(file);
          if (uploadedUrl) {
            setLogoUrl(uploadedUrl);
            toast({ title: t('Logo uploaded') });
          } else {
            setLogoPreview(source.logo_url || null);
            toast({ title: t('Failed to upload logo'), variant: "destructive" });
          }
          setUploadingLogo(false);
        }
        break;
      }
    }
  }, [toast, source.logo_url]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingLogo(true);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      
      const uploadedUrl = await uploadLogo(file);
      if (uploadedUrl) {
        setLogoUrl(uploadedUrl);
        toast({ title: t('Logo uploaded') });
      } else {
        setLogoPreview(source.logo_url || null);
        toast({ title: t('Failed to upload logo'), variant: "destructive" });
      }
      setUploadingLogo(false);
    }
  };

  const willOverwriteContent = () => {
    const urlChanged = url !== source.url;
    const feedUrlChanged = feedUrl !== (source.feed_url || '');
    const typeChanged = sourceType !== source.source_type;
    return urlChanged || feedUrlChanged || typeChanged;
  };

  const doSave = async () => {
    setLoading(true);
    try {
      const updates: Partial<ResearchSource> = {
        name: name.trim(),
        url: url.trim(),
        feed_url: feedUrl.trim() || null,
        category,
        source_type: sourceType,
        description: description.trim() || null,
        tags: tags.length > 0 ? tags : null,
        priority,
        logo_url: logoUrl || null
      };

      onSave(source.id, updates);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    if (willOverwriteContent()) {
      setShowOverwriteConfirm(true);
      return;
    }

    await doSave();
  };

  const handleConfirmOverwrite = async () => {
    setShowOverwriteConfirm(false);
    await doSave();
  };

  const clearLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoPreview(null);
    setLogoUrl('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
            <DialogTitle>{t('Edit Source')}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
              {/* Logo Upload - matching DealFormDialog design */}
              <LogoUploadSection
                logoPreview={logoPreview}
                name={name}
                uploadingLogo={uploadingLogo}
                onPaste={handlePaste}
                onFileChange={handleFileChange}
                onClear={clearLogo}
                inputId="edit-logo-upload"
              />

              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('Name')} *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('Source name')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-url">{t('Website URL')} *</Label>
                <Input
                  id="edit-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Category')}</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as SourceCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">{t('News')}</SelectItem>
                      <SelectItem value="research">{t('Research')}</SelectItem>
                      <SelectItem value="podcast">{t('Podcast')}</SelectItem>
                      <SelectItem value="report">{t('Report')}</SelectItem>
                      <SelectItem value="twitter">{t('X (Twitter)')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('Update Method')}</Label>
                  <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rss">{t('RSS Feed')}</SelectItem>
                      <SelectItem value="crawl">{t('Web Crawl')}</SelectItem>
                      <SelectItem value="manual">{t('Manual Only')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority - P1-P5 buttons */}
              <div className="space-y-2">
                <Label>{t('Priority')}</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "w-9 h-9 rounded-lg text-xs font-medium transition-colors",
                        priority === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      P{p}
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t(priorityLabels[priority])}
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>{t('Tags')}</Label>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={t('Type and press Enter')}
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {sourceType === 'rss' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-feedUrl">{t('RSS Feed URL')}</Label>
                  <Input
                    id="edit-feedUrl"
                    type="url"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder={t('https://example.com/feed.xml')}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('Description')}</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Brief description...')}
                  rows={2}
                />
              </div>
            </form>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !name.trim() || !url.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Overwrite existing articles?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Changing the URL, feed URL, or source type will trigger a re-sync. This may fetch new articles and could affect your existing reading history.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOverwrite}>
              {t('Continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
