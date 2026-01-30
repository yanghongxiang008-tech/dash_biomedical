import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { Contact } from './types';
import { useI18n } from '@/i18n';

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSuccess: (newContactId?: string) => void;
}

const ContactFormDialog: React.FC<ContactFormDialogProps> = ({ open, onOpenChange, contact, onSuccess }) => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    role: '',
    contact_type: 'investor' as 'investor' | 'fa' | 'portco' | 'expert',
    email: '',
    tags: [] as string[],
    notes: '',
  });

  const contactTypeOptions = [
    { value: 'investor', label: t('Investor') },
    { value: 'fa', label: t('FA') },
    { value: 'portco', label: t('PortCo') },
    { value: 'expert', label: t('Expert') },
  ];

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        company: contact.company || '',
        role: contact.role || '',
        contact_type: contact.contact_type,
        email: contact.email || '',
        tags: contact.tags || [],
        notes: contact.notes || '',
      });
    } else {
      setFormData({
        name: '',
        company: '',
        role: '',
        contact_type: 'investor',
        email: '',
        tags: [],
        notes: '',
      });
    }
    setTagInput('');
  }, [contact, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const processTags = (input: string): string[] => {
    return input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    
    // Check if user typed a comma
    if (value.endsWith(',')) {
      const newTags = processTags(value);
      if (newTags.length > 0) {
        const uniqueTags = newTags.filter(tag => !formData.tags.includes(tag));
        if (uniqueTags.length > 0) {
          setFormData(prev => ({ ...prev, tags: [...prev.tags, ...uniqueTags] }));
        }
        setTagInput('');
      }
    }
  };

  const handleAddTags = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTags = processTags(tagInput);
      if (newTags.length > 0) {
        const uniqueTags = newTags.filter(tag => !formData.tags.includes(tag));
        if (uniqueTags.length > 0) {
          setFormData(prev => ({ ...prev, tags: [...prev.tags, ...uniqueTags] }));
        }
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: t('Error'),
        description: t('Name is required'),
        variant: 'destructive',
      });
      return;
    }

    // Process any remaining tags in input
    let finalTags = [...formData.tags];
    if (tagInput.trim()) {
      const remainingTags = processTags(tagInput).filter(tag => !finalTags.includes(tag));
      finalTags = [...finalTags, ...remainingTags];
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: t('Error'), description: t('You must be logged in'), variant: 'destructive' });
        return;
      }

      const payload = {
        name: formData.name.trim(),
        company: formData.company.trim() || null,
        role: formData.role.trim() || null,
        contact_type: formData.contact_type,
        email: formData.email.trim() || null,
        tags: finalTags.length > 0 ? finalTags : null,
        notes: formData.notes.trim() || null,
      };

      if (contact) {
        const { error } = await supabase
          .from('contacts')
          .update(payload)
          .eq('id', contact.id);
        if (error) throw error;
        toast({ title: t('Success'), description: t('Contact updated successfully') });
        onSuccess();
      } else {
        const { data, error } = await supabase.from('contacts').insert([{ ...payload, user_id: user.id }]).select('id').single();
        if (error) throw error;
        toast({ title: t('Success'), description: t('Contact created successfully') });
        onSuccess(data?.id);
      }
    } catch (error: any) {
      toast({
        title: t('Error'),
        description: error.message || t('Failed to save contact'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md max-h-[85vh] p-0 gap-0 flex flex-col border-0 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
     >
        {/* Header */}
        <div className="flex items-center p-5 flex-shrink-0">
          <h2 className="text-lg font-medium" >
            {contact ? t('Edit Contact') : t('New Contact')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-5 pb-5 flex-1 min-h-0 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('Name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={t('Full name')}
                  className="h-9 bg-muted/30 border-0 focus-visible:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('Type')} *</Label>
                <Select 
                  value={formData.contact_type} 
                  onValueChange={(v) => handleChange('contact_type', v)}
               >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {contactTypeOptions.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('Company')}</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder={t('Company name')}
                  className="h-9 bg-muted/30 border-0 focus-visible:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('Role')}</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  placeholder={t('e.g., Partner, CEO')}
                  className="h-9 bg-muted/30 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('Email')}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder={t('email@example.com')}
                className="h-9 bg-muted/30 border-0 focus-visible:ring-1"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('Tags')}</Label>
              <Input
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleAddTags}
                placeholder={t('Use comma (,) to separate tags')}
                className="h-9 bg-muted/30 border-0 focus-visible:ring-1"
              />
              <p className="text-[10px] text-muted-foreground">
                {t('Type tags separated by commas, then press Enter')}
              </p>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="text-xs px-2 py-0.5 gap-1 bg-muted/50"
                   >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive ml-1"
                     >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('Notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={t('Additional notes...')}
                rows={3}
                className="text-sm resize-none bg-muted/30 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-5 pt-4 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
           >
              {t('Cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? t('Saving...') : contact ? t('Update') : t('Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactFormDialog;
