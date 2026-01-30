import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './DailyNotesEditor.css';
import ConfirmDialog from "./ConfirmDialog";
import { useI18n } from "@/i18n";

interface DailyNotesEditorProps {
  selectedDate: Date;
  isEditMode?: boolean;
}

const DailyNotesEditor: React.FC<DailyNotesEditorProps> = ({ selectedDate, isEditMode = false }) => {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const currentDate = format(selectedDate, 'yyyy-MM-dd');

  // Quill editor configuration - simplified toolbar
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'bold', 'italic', 'underline',
    'color', 'background', 'list', 'bullet', 'link'
  ];

  // Fetch existing notes for the selected date
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('content')
        .eq('date', currentDate)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const noteContent = data?.content || '';
      setContent(noteContent);
      setSavedContent(noteContent);
    } catch (error) {
      console.error('Error fetching daily notes:', error);
      toast({
        title: t("Error"),
        description: t("Failed to fetch daily notes"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Save notes to database (internal function for auto-save)
  const saveNotesInternal = useCallback(async (contentToSave: string, dateToSave: string) => {
    setAutoSaveStatus('saving');
    
    try {
      const { error } = await supabase
        .from('daily_notes')
        .upsert({
          date: dateToSave,
          content: contentToSave.trim()
        }, {
          onConflict: 'date'
        });

      if (error) throw error;

      setSavedContent(contentToSave);
      setAutoSaveStatus('saved');
      
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving daily notes:', error);
      setAutoSaveStatus('idle');
      toast({
        title: t("Error"),
        description: t("Failed to save daily notes"),
        variant: "destructive"
      });
    }
  }, [toast]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!isEditing || content === savedContent) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveNotesInternal(content, currentDate);
    }, 1500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, savedContent, isEditing, currentDate, saveNotesInternal]);

  // Click outside detection
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (editorContainerRef.current && !editorContainerRef.current.contains(event.target as Node)) {
        // Save any pending changes before exiting
        if (content !== savedContent) {
          if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
          }
          saveNotesInternal(content, currentDate);
        }
        setIsEditing(false);
      }
    };

    // Delay adding the listener to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, content, savedContent, currentDate, saveNotesInternal]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  // Delete notes from database
  const handleClearNotes = async () => {
    try {
      const { error } = await supabase
        .from('daily_notes')
        .delete()
        .eq('date', currentDate);

      if (error) throw error;

      setContent('');
      setSavedContent('');
      setIsEditing(false);
      setShowClearConfirm(false);
      
      toast({
        title: t("Success"),
        description: t("Market notes cleared successfully"),
      });
    } catch (error) {
      console.error('Error clearing notes:', error);
      toast({
        title: t("Error"),
        description: t("Failed to clear market notes"),
        variant: "destructive"
      });
    }
  };

  // Load notes when date changes
  useEffect(() => {
    fetchNotes();
  }, [selectedDate]);

  const hasChanges = content !== savedContent;

  return (
    <Card className="border border-border/60 bg-background shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t("Market Notes")}</h3>
          <p className="text-[10px] text-muted-foreground">{format(selectedDate, "EEEE, MMM dd, yyyy")}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Auto-save status */}
          {isEditing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                  <span className="text-[10px] text-amber-600">{t("Saving...")}</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600">{t("Saved")}</span>
                </>
              )}
              {autoSaveStatus === 'idle' && hasChanges && (
                <span className="text-[10px] text-amber-600">{t("Editing...")}</span>
              )}
              {autoSaveStatus === 'idle' && !hasChanges && (
                <span className="text-[10px] text-muted-foreground">{t("Auto Save")}</span>
              )}
            </div>
          )}
          
          {/* Clear button */}
          {isEditMode && savedContent && !isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowClearConfirm(true)}
              className="h-7 px-2 text-muted-foreground hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Editor Content */}
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        ) : isEditing ? (
          <div ref={editorContainerRef} className="daily-notes-editor-light">
            <ReactQuill
              value={content}
              onChange={setContent}
              modules={modules}
              formats={formats}
              placeholder={t("Summarize daily market moves, key news, and insights...")}
              theme="snow"
            />
          </div>
        ) : (
          <div 
            className={`min-h-[200px] p-4 ${isEditMode ? 'cursor-text hover:bg-muted/30' : 'cursor-default'} transition-colors`}
            onClick={() => isEditMode && setIsEditing(true)}
          >
            {content ? (
              <div 
                className="prose prose-sm max-w-none 
                  prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:my-1.5
                  prose-strong:text-foreground 
                  prose-ul:text-foreground/80 prose-ol:text-foreground/80 
                  prose-li:text-foreground/80 prose-li:my-0.5
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  text-[11px] sm:text-xs"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <div className="flex items-center justify-center h-[160px]">
                <p className="text-muted-foreground text-xs">{t("Click to add today's market notes")}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={handleClearNotes}
        title={t("Clear Market Notes")}
        description={t("Are you sure you want to clear all market notes for {date}? This action cannot be undone.", {
          date: format(selectedDate, 'MMMM d, yyyy')
        })}
        confirmText={t("Clear")}
        cancelText={t("Cancel")}
      />
    </Card>
  );
};

export default DailyNotesEditor;
