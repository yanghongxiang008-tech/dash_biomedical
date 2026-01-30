import React, { useState, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SourceCategory, SourceType } from '@/hooks/useResearch';
import { Loader2, X, Upload, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSourceNames?: string[];
  onAdd: (source: {
    name: string;
    url: string;
    feed_url?: string;
    category: SourceCategory;
    source_type: SourceType;
    description?: string;
    tags?: string[];
    priority?: number;
    logo_url?: string;
  }) => Promise<any>;
}

const priorityLabels: Record<number, string> = {
  1: 'Low',
  2: 'Below Avg',
  3: 'Average',
  4: 'High',
  5: 'Critical'
};

// Get initials from name
const getInitials = (name: string) => {
  return name.substring(0, 2).toUpperCase();
};

// Reusable Logo Upload Section - matching DealFormDialog design
interface LogoUploadSectionProps {
  logoPreview: string | null;
  name: string;
  uploadingLogo: boolean;
  onPaste: (e: React.ClipboardEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: (e: React.MouseEvent) => void;
  inputId: string;
}

export const LogoUploadSection: React.FC<LogoUploadSectionProps> = ({
  logoPreview,
  name,
  uploadingLogo,
  onPaste,
  onFileChange,
  onClear,
  inputId
}) => {
  const { t } = useI18n();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  return (
    <div 
      onPaste={onPaste}
      className="flex items-start gap-4 p-3 border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary/20 cursor-pointer"
      tabIndex={0}
      title={t('Click and paste (Ctrl+V) to add logo')}
    >
      <div className="flex-shrink-0">
        {logoPreview ? (
          <img 
            src={logoPreview} 
            alt={t('Logo')}
            className="w-14 h-14 rounded-lg object-contain bg-background border border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
            {name ? getInitials(name) : <Building2 className="w-6 h-6" />}
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-xs font-medium">
          {t('Source Logo')}{' '}
          <span className="text-muted-foreground font-normal">{t('(or Ctrl+V to paste)')}</span>
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingLogo}
          >
            {uploadingLogo ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Upload className="w-3 h-3 mr-1" />
            )}
            {t('Upload')}
          </Button>
          {logoPreview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive"
              onClick={onClear}
            >
              {t('Remove')}
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
};


export const AddSourceDialog: React.FC<AddSourceDialogProps> = ({
  open,
  onOpenChange,
  existingSourceNames = [],
  onAdd
}) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  
  // Check if name already exists (case-insensitive)
  const isDuplicateName = name.trim() !== '' && 
    existingSourceNames.some(n => n.toLowerCase() === name.trim().toLowerCase());
  const [url, setUrl] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [category, setCategory] = useState<SourceCategory>('news');
  const [sourceType, setSourceType] = useState<SourceType>('rss');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState(3);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const resetForm = () => {
    setName('');
    setUrl('');
    setFeedUrl('');
    setCategory('news');
    setSourceType('rss');
    setDescription('');
    setTags([]);
    setTagInput('');
    setPriority(3);
    setLogoUrl('');
    setLogoPreview(null);
  };

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
            setLogoPreview(null);
            toast({ title: t('Failed to upload logo'), variant: "destructive" });
          }
          setUploadingLogo(false);
        }
        break;
      }
    }
  }, [toast]);

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
        setLogoPreview(null);
        toast({ title: t('Failed to upload logo'), variant: "destructive" });
      }
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setLoading(true);
    try {
      const result = await onAdd({
        name: name.trim(),
        url: url.trim(),
        feed_url: feedUrl.trim() || undefined,
        category,
        source_type: sourceType,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        priority,
        logo_url: logoUrl || undefined
      });

      if (result) {
        resetForm();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoPreview(null);
    setLogoUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <DialogTitle>{t('Add Information Source')}</DialogTitle>
          <DialogDescription>
            {t('Add a new RSS feed, website, or manual source to track updates.')}
          </DialogDescription>
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
              inputId="logo-upload"
            />

            <div className="space-y-2">
              <Label htmlFor="name">{t('Name')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('e.g., The Economist')}
                required
                className={cn(isDuplicateName && "border-destructive focus-visible:ring-destructive")}
              />
              {isDuplicateName && (
                <p className="text-xs text-destructive">
                  {t('A source with this name already exists')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">{t('Website URL')} *</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t('Category')}</Label>
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
                <Label htmlFor="sourceType">{t('Update Method')}</Label>
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
                <Label htmlFor="feedUrl">{t('RSS Feed URL')}</Label>
                <Input
                  id="feedUrl"
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder={t('https://example.com/feed.xml (optional)')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('Leave empty to auto-detect RSS feed')}
                </p>
              </div>
            )}

            {sourceType === 'crawl' && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                {t('This source will be crawled periodically to detect content changes.')}
              </p>
            )}

            {sourceType === 'manual' && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                {t('You\'ll need to manually add updates (useful for paid content).')}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">{t('Description (optional)')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('Brief description of this source...')}
                rows={2}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim() || !url.trim() || isDuplicateName}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Add Source')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
