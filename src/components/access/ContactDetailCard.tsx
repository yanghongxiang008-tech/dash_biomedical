import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Pencil, Trash2, Building2, Mail, Tag, FileText, Plus,
  Calendar, MessageSquare, ChevronDown, ChevronRight,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import type { Contact, Interaction } from './types';
import { contactTypeConfig } from './types';
import ConfirmDialog from '@/components/ConfirmDialog';
import DealFormDialog from '@/components/deals/DealFormDialog';
import { useI18n } from '@/i18n';

interface Deal {
  id: string;
  project_name: string;
}

interface ContactDetailCardProps {
  contact: Contact | null;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
}

const ContactDetailCard: React.FC<ContactDetailCardProps> = ({ contact, onClose, onEdit, onDelete }) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['no-project']));
  const [newInteraction, setNewInteraction] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    dealId: '',
  });
  const [addingInteraction, setAddingInteraction] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  useEffect(() => {
    if (contact?.id) {
      fetchInteractions(contact.id);
      fetchDeals();
    }
  }, [contact?.id]);

  const fetchInteractions = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('interaction_date', { ascending: false });
      
      if (!error && data) {
        // Fetch deal info including logo_url for interactions that have deal_id
        const dealIds = data.filter(i => i.deal_id).map(i => i.deal_id);
        let dealMap: Record<string, { project_name: string; logo_url: string | null }> = {};
        
        if (dealIds.length > 0) {
          const { data: dealsData } = await supabase
            .from('deals')
            .select('id, project_name, logo_url')
            .in('id', dealIds);
          
          if (dealsData) {
            dealMap = dealsData.reduce((acc, d) => ({ 
              ...acc, 
              [d.id]: { project_name: d.project_name, logo_url: d.logo_url } 
            }), {});
          }
        }
        
        const interactionsWithDeals = data.map(i => ({
          ...i,
            deal: i.deal_id ? { 
            id: i.deal_id, 
            project_name: dealMap[i.deal_id]?.project_name || t('Unknown'),
            logo_url: dealMap[i.deal_id]?.logo_url || null
          } : null,
        }));
        
        setInteractions(interactionsWithDeals);
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('id, project_name')
        .order('project_name');
      
      if (!error && data) {
        setDeals(data);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const handleNewProjectSuccess = async () => {
    // Fetch the newly created project (most recent one)
    const { data } = await supabase
      .from('deals')
      .select('id, project_name')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      // Update deals list
      await fetchDeals();
      // Auto-select the new project
      setNewInteraction(prev => ({ ...prev, dealId: data[0].id }));
    }
    
    setShowNewProjectDialog(false);
  };

  const handleAddInteraction = async () => {
    if (!contact || !newInteraction.date) return;
    
    setAddingInteraction(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: t('Error'), description: t('You must be logged in'), variant: 'destructive' });
        return;
      }

      const dealId = newInteraction.dealId || null;
      
      const { error } = await supabase.from('interactions').insert([{
        contact_id: contact.id,
        interaction_date: new Date(newInteraction.date).toISOString(),
        notes: newInteraction.notes.trim() || null,
        deal_id: dealId,
        user_id: user.id,
      }]);
      
      if (error) throw error;

      // If linking to a project, also add contact to project's key_contacts (bidirectional link)
      if (dealId) {
        const { data: dealData } = await supabase
          .from('deals')
          .select('key_contacts')
          .eq('id', dealId)
          .single();
        
        if (dealData) {
          let existingContactIds: string[] = [];
          try {
            existingContactIds = JSON.parse(dealData.key_contacts || '[]');
          } catch { existingContactIds = []; }
          
          // Only add if not already in the list
          if (!existingContactIds.includes(contact.id)) {
            const updatedContactIds = [...existingContactIds, contact.id];
            await supabase
              .from('deals')
              .update({ key_contacts: JSON.stringify(updatedContactIds) })
              .eq('id', dealId);
          }
        }
      }
      
      toast({ title: t('Success'), description: t('Interaction added') });
      setNewInteraction({ date: format(new Date(), 'yyyy-MM-dd'), notes: '', dealId: '' });
      setShowAddInteraction(false);
      fetchInteractions(contact.id);
    } catch (error: any) {
      toast({ title: t('Error'), description: error.message || t('Failed to add interaction'), variant: 'destructive' });
    } finally {
      setAddingInteraction(false);
    }
  };

  const deleteInteraction = async (interactionId: string) => {
    try {
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', interactionId);
      
      if (!error && contact) {
        setInteractions(prev => prev.filter(i => i.id !== interactionId));
        toast({ title: t('Success'), description: t('Interaction deleted') });
      }
    } catch (error) {
      console.error('Error deleting interaction:', error);
    }
  };

  const navigateToProject = (dealId: string) => {
    onClose();
    navigate('/private', { state: { openDealId: dealId } });
  };

  // Group interactions by project
  const groupedInteractions = useMemo(() => {
    const groups: Record<string, { projectName: string; logoUrl: string | null; interactions: Interaction[] }> = {};
    
    interactions.forEach(interaction => {
      const key = interaction.deal_id || 'no-project';
      if (!groups[key]) {
        groups[key] = {
          projectName: interaction.deal?.project_name || t('General'),
          logoUrl: interaction.deal?.logo_url || null,
          interactions: []
        };
      }
      groups[key].interactions.push(interaction);
    });
    
    return groups;
  }, [interactions]);

  // Get unique projects for filter (with logo_url)
  const projectsInInteractions = useMemo(() => {
    const projects: { id: string; name: string; logo_url: string | null }[] = [];
    const seen = new Set<string>();
    
    interactions.forEach(i => {
      if (i.deal_id && !seen.has(i.deal_id)) {
        seen.add(i.deal_id);
        projects.push({ 
          id: i.deal_id, 
          name: i.deal?.project_name || t('Unknown'),
          logo_url: i.deal?.logo_url || null
        });
      }
    });
    
    return projects;
  }, [interactions]);

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Filter interactions - when a project is selected, auto-expand it
  const filteredGroups = useMemo(() => {
    if (!filterProjectId) return groupedInteractions;
    
    const filtered: typeof groupedInteractions = {};
    Object.entries(groupedInteractions).forEach(([key, value]) => {
      if (key === filterProjectId) {
        filtered[key] = value;
      }
    });
    return filtered;
  }, [groupedInteractions, filterProjectId]);

  // Auto-expand when filter is selected
  useEffect(() => {
    if (filterProjectId) {
      setExpandedProjects(new Set([filterProjectId]));
    }
  }, [filterProjectId]);

  if (!contact) return null;

  const typeConfig = contactTypeConfig[contact.contact_type];

  return (
    <>
      <Dialog open={!!contact} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0 gap-0 shadow-2xl rounded-2xl bg-white dark:bg-[hsl(222,47%,8%)]">
          {/* Header */}
          <div className="p-6 pb-5 bg-gradient-to-b from-muted/30 to-transparent">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${typeConfig.bg} shadow-sm`}>
                <span className={`text-xl font-semibold ${typeConfig.color}`}>
                  {contact.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold tracking-tight" >
                  {contact.name}
                </h2>
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide ${typeConfig.bg} ${typeConfig.color}`}>
                    {t(typeConfig.label)}
                  </span>
                  {(contact.role || contact.company) && (
                    <span className="text-xs text-muted-foreground/70">
                      {contact.role && <span>{contact.role}</span>}
                      {contact.role && contact.company && <span className="mx-1.5 text-muted-foreground/40">·</span>}
                      {contact.company && <span className="font-medium text-foreground/70">{contact.company}</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-4 text-xs gap-2 rounded-lg hover:bg-muted/50"
                  onClick={() => onEdit(contact)}
             >
                <Pencil className="w-3.5 h-3.5" />
                {t('Edit')}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 px-4 text-xs gap-2 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
             >
                <Trash2 className="w-3.5 h-3.5" />
                {t('Delete')}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-6 pb-6 space-y-6 max-h-[calc(85vh-200px)]">
            {/* Contact Info */}
            {contact.email && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> {t('Email')}
                </p>
                <a href={`mailto:${contact.email}`} className="text-sm text-foreground/80 hover:text-primary transition-colors">
                  {contact.email}
                </a>
              </div>
            )}

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> {t('Tags')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-lg bg-muted/40 text-muted-foreground/80 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div className="space-y-2.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> {t('Notes')}
                </p>
                <p className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
              </div>
            )}

            {/* Interactions */}
            <div className="space-y-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground/70 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {t('Interactions')}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg"
                  onClick={() => setShowAddInteraction(!showAddInteraction)}
               >
                  <Plus className="w-3.5 h-3.5" />
                  {t('Add')}
                </Button>
              </div>

              {/* Project Filter */}
              {projectsInInteractions.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterProjectId(null)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                      !filterProjectId 
                        ? 'bg-foreground text-background shadow-sm' 
                        : 'text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground'
                    }`}
                 >
                    {t('All')}
                  </button>
                  {projectsInInteractions.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setFilterProjectId(p.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                        filterProjectId === p.id 
                          ? 'bg-primary/10 text-primary shadow-sm' 
                          : 'text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground'
                      }`}
                   >
                      {p.logo_url ? (
                        <img 
                          src={p.logo_url} 
                          alt={p.name} 
                          className="w-4 h-4 rounded object-cover flex-shrink-0 ring-1 ring-border/30"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-[8px] font-semibold text-muted-foreground">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Add Interaction Form */}
              {showAddInteraction && (
                <div className="p-4 rounded-xl bg-muted/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Date')}</label>
                      <Input
                        type="date"
                        value={newInteraction.date}
                        onChange={(e) => setNewInteraction(prev => ({ ...prev, date: e.target.value }))}
                        className="h-8 text-sm bg-background/50 border-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Link Project')}</label>
                      <div className="flex gap-2">
                        <Select 
                          value={newInteraction.dealId || "none"} 
                          onValueChange={(v) => setNewInteraction(prev => ({ ...prev, dealId: v === "none" ? "" : v }))}
                       >
                          <SelectTrigger className="h-8 text-sm bg-background/50 border-0 flex-1">
                            <SelectValue placeholder={t('None')} />
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={4}>
                            <SelectItem value="none">{t('None')}</SelectItem>
                            {deals.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.project_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => setShowNewProjectDialog(true)}
                       >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Notes')}</label>
                    <Textarea
                      value={newInteraction.notes}
                      onChange={(e) => setNewInteraction(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={t('What was discussed...')}
                      rows={2}
                      className="text-sm resize-none bg-background/50 border-0"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddInteraction(false)}>
                      {t('Cancel')}
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddInteraction} disabled={addingInteraction}>
                      {addingInteraction ? t('Adding...') : t('Add')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Interaction Timeline - Grouped by Project */}
              {Object.keys(filteredGroups).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(filteredGroups).map(([projectId, group]) => {
                    const isExpanded = expandedProjects.has(projectId);
                    const isNoProject = projectId === 'no-project';
                    
                    // When filter is active, show flat list without collapsible header
                    const showFlat = filterProjectId !== null;
                    
                    return (
                      <div key={projectId} className="space-y-2">
                        {/* Project Header - only show as collapsible when not filtered */}
                        {!showFlat && (
                          <button
                            onClick={() => toggleProjectExpanded(projectId)}
                            className="flex items-center gap-2 w-full text-left group"
                         >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            {!isNoProject && (
                              group.logoUrl ? (
                                <img 
                                  src={group.logoUrl} 
                                  alt={group.projectName} 
                                  className="w-4 h-4 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <span className="text-[8px] font-semibold text-muted-foreground">
                                    {group.projectName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )
                            )}
                            <span className="text-sm font-medium">
                              {group.projectName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({group.interactions.length})
                            </span>
                            {!isNoProject && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToProject(projectId);
                                }}
                                className="ml-auto p-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </button>
                            )}
                          </button>
                        )}
                        
                        {/* Interactions - show when expanded or when filter is active */}
                        {(isExpanded || showFlat) && (
                          <div className={`relative space-y-2 ${!showFlat ? 'pl-5 ml-1.5' : ''}`}>
                            {!showFlat && <div className="absolute left-[5px] top-1 bottom-1 w-px bg-muted" />}
                            {group.interactions.map(interaction => (
                              <div key={interaction.id} className="relative group/item">
                                {!showFlat && <div className="absolute left-[-15px] top-2 w-2 h-2 rounded-full bg-primary/30" />}
                                <div className="p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                  <div className="flex items-start gap-2">
                                    {/* Project logo */}
                                    {interaction.deal && (
                                      interaction.deal.logo_url ? (
                                        <img 
                                          src={interaction.deal.logo_url} 
                                          alt={interaction.deal.project_name} 
                                          className="w-5 h-5 rounded object-cover flex-shrink-0 mt-0.5"
                                        />
                                      ) : (
                                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <span className="text-[8px] font-semibold text-muted-foreground">
                                            {interaction.deal.project_name.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                      )
                                    )}
                                    <div className="flex-1 min-w-0">
                                      {/* Project name - clickable */}
                                      {interaction.deal && (
                                        <button
                                          onClick={() => navigateToProject(interaction.deal!.id)}
                                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1 mb-1"
                                       >
                                          {interaction.deal.project_name}
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                      {/* Date - smaller */}
                                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {format(new Date(interaction.interaction_date), 'MMM d, yyyy')}
                                      </p>
                                      {/* Notes - smaller */}
                                      {interaction.notes && (
                                        <p className="text-xs text-foreground/70 mt-1.5 line-clamp-3">
                                          {interaction.notes}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => deleteInteraction(interaction.id)}
                                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-all flex-shrink-0"
                                   >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">{t('No interactions yet')}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('Delete Contact')}
        description={t('Are you sure you want to delete "{name}"? This will also delete all related interactions.', { name: contact.name })}
        confirmText={t('Delete')}
        onConfirm={() => {
          onDelete(contact.id);
          setConfirmDelete(false);
        }}
      />

      <DealFormDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
        deal={null}
        onSuccess={handleNewProjectSuccess}
      />
    </>
  );
};

export default ContactDetailCard;
