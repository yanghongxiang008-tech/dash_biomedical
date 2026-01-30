import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ContactFormDialog from '@/components/access/ContactFormDialog';
import { contactTypeConfig } from '@/components/access/types';
import { useI18n } from '@/i18n';

interface Contact {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  contact_type: string;
  tags: string[] | null;
}

interface ContactSelectorProps {
  selectedContactIds: string[];
  onChange: (contactIds: string[]) => void;
  onNavigateToContact?: (contactId: string) => void;
}

const ContactSelector: React.FC<ContactSelectorProps> = ({ 
  selectedContactIds, 
  onChange,
  onNavigateToContact 
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('id, name, role, company, contact_type, tags')
      .order('name');
    if (data) setContacts(data);
  };

  const selectedContacts = contacts.filter(c => selectedContactIds.includes(c.id));

  const groupedContacts = contacts.reduce((acc, contact) => {
    const type = contact.contact_type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  const getTypeLabel = (type: string) => {
    const config = contactTypeConfig[type];
    return config ? t(config.label) : t('Other');
  };

  const handleSelect = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      onChange(selectedContactIds.filter(id => id !== contactId));
    } else {
      onChange([...selectedContactIds, contactId]);
    }
  };

  const handleRemove = (contactId: string) => {
    onChange(selectedContactIds.filter(id => id !== contactId));
  };

  const handleAddContactSuccess = async (newContactId?: string) => {
    // Refresh contacts list first
    await fetchContacts();
    
    // Add the newly created contact to selection if ID provided
    if (newContactId) {
      onChange([...selectedContactIds, newContactId]);
    }
    
    setShowAddDialog(false);
  };

  const handleNavigateToContact = (contactId: string) => {
    if (onNavigateToContact) {
      onNavigateToContact(contactId);
    } else {
      navigate('/private', { state: { openContactId: contactId, activeTab: 'access' } });
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{t('Key Contacts')}</Label>
      
      {/* Selected Contacts */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedContacts.map(contact => (
            <div 
              key={contact.id}
              className="group flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 border border-border/50 text-xs"
            >
              <button
                type="button"
                onClick={() => handleNavigateToContact(contact.id)}
                className="hover:text-primary hover:underline"
              >
                {contact.name}
              </button>
              {contact.role && contact.company && (
                <span className="text-muted-foreground">
                  ({contact.role} @ {contact.company})
                </span>
              )}
              <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                {getTypeLabel(contact.contact_type)}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(contact.id)}
                className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Contact Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-8 text-xs font-normal"
            type="button"
          >
            <span className="text-muted-foreground">
              {selectedContacts.length > 0 
                ? t('Selected {count} contacts', { count: selectedContacts.length })
                : t('Select contacts...')
              }
            </span>
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('Search contacts...')} className="h-8 text-xs focus:ring-0 focus:border-transparent" />
            <CommandList>
              <CommandEmpty className="py-2 px-3 text-xs text-muted-foreground">
                {t('No contacts found.')}
              </CommandEmpty>
              {Object.entries(groupedContacts).map(([type, typeContacts]) => (
                <CommandGroup key={type} heading={getTypeLabel(type)} className="text-xs">
                  {typeContacts.map(contact => (
                    <CommandItem
                      key={contact.id}
                      value={`${contact.name} ${contact.company || ''}`}
                      onSelect={() => handleSelect(contact.id)}
                      className="text-xs py-2"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3",
                          selectedContactIds.includes(contact.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{contact.name}</span>
                        {(contact.role || contact.company) && (
                          <span className="text-muted-foreground ml-1">
                            {contact.role && contact.company 
                              ? `(${contact.role} @ ${contact.company})`
                              : contact.role || contact.company
                            }
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <div className="border-t border-border p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs justify-start"
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowAddDialog(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1.5" />
                {t('Add new contact')}
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Add Contact Dialog - Using full ContactFormDialog from Access */}
      <ContactFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        contact={null}
        onSuccess={handleAddContactSuccess}
      />
    </div>
  );
};

export default ContactSelector;
