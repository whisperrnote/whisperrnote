'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Notes } from '@/types/appwrite';
import DoodleCanvas from '@/components/DoodleCanvas';
import { TrashIcon, UserIcon, ClipboardDocumentIcon, PaperClipIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Modal } from './modal';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useDynamicSidebar } from '@/components/ui/DynamicSidebar';
import { formatNoteCreatedDate, formatNoteUpdatedDate } from '@/lib/date-utils';
import { getNoteWithSharing, updateNote } from '@/lib/appwrite';
import { formatFileSize } from '@/lib/utils';
import NoteContentDisplay from '@/components/NoteContentDisplay';
import { NoteContentRenderer } from '@/components/NoteContentRenderer';
import { useAutosave } from '@/hooks/useAutosave';

interface NoteDetailSidebarProps {
  note: Notes;
  onUpdate: (updatedNote: Notes) => void;
  onDelete: (noteId: string) => void;
  showExpandButton?: boolean;
  showHeaderDeleteButton?: boolean;
}

interface EnhancedNote extends Notes {
  isSharedWithUser?: boolean;
  sharePermission?: string;
  sharedBy?: { name: string; email: string } | null;
}

const shallowArrayEqual = (a?: string[] | null, b?: string[] | null) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export function NoteDetailSidebar({
  note,
  onUpdate,
  onDelete,
  showExpandButton = true,
  showHeaderDeleteButton = true,
}: NoteDetailSidebarProps) {
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const isEditing = isEditingTitle || isEditingContent;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDoodleEditor, setShowDoodleEditor] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [format, setFormat] = useState<'text' | 'doodle'>(note.format as 'text' | 'doodle' || 'text');
  const [tags, setTags] = useState(note.tags?.join(', ') || '');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [currentAttachments, setCurrentAttachments] = useState<any[]>([]);
  const [enhancedNote, setEnhancedNote] = useState<EnhancedNote | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const titleIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasEditingRef = useRef(isEditing);
  const prevNoteIdRef = useRef(note.$id);

  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const { closeSidebar } = useDynamicSidebar();

  const handleOpenFullPage = () => {
    if (!note.$id) return;
    closeSidebar();
    router.push(`/notes/${note.$id}`);
  };

  useEffect(() => {
    const loadEnhancedNote = async () => {
      try {
        const data = await getNoteWithSharing(note.$id);
        setEnhancedNote(data);
      } catch (err) {
        console.error('Error loading shared note details:', err);
        setEnhancedNote(null);
      }
    };

    if (note.attachments && Array.isArray(note.attachments)) {
      try {
        const parsed = note.attachments.map((a: any) => (typeof a === 'string' ? JSON.parse(a) : a));
        setCurrentAttachments(parsed);
      } catch (err) {
        console.error('Error parsing attachments:', err);
        setCurrentAttachments([]);
      }
    } else {
      setCurrentAttachments([]);
    }

    loadEnhancedNote();
  }, [note.$id]);

  useEffect(() => {
    const noteIdChanged = note.$id !== prevNoteIdRef.current;
    if (!noteIdChanged) return;
    prevNoteIdRef.current = note.$id;
    setTitle(note.title || '');
    setContent(note.content || '');
    setFormat((note.format as 'text' | 'doodle') || 'text');
    setTags((note.tags || []).join(', '));
    setIsEditingTitle(false);
    setIsEditingContent(false);
  }, [note.$id, note.title, note.content, note.format, note.tags]);

  const normalizedTags = useMemo(() => {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [tags]);

  const displayTitle = title || note.title || 'Untitled note';
  const displayContent = content || note.content || '';
  const displayFormat = format;
  const displayTags = normalizedTags.length > 0 ? normalizedTags : (note.tags || []);

  const resetTitleIdleTimer = () => {
    if (titleIdleTimer.current) {
      clearTimeout(titleIdleTimer.current);
    }
    titleIdleTimer.current = setTimeout(() => setIsEditingTitle(false), 15000);
  };

  const resetContentIdleTimer = () => {
    if (contentIdleTimer.current) {
      clearTimeout(contentIdleTimer.current);
    }
    contentIdleTimer.current = setTimeout(() => setIsEditingContent(false), 15000);
  };

  useEffect(() => {
    if (!isEditingTitle && titleIdleTimer.current) {
      clearTimeout(titleIdleTimer.current);
      titleIdleTimer.current = null;
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!isEditingContent && contentIdleTimer.current) {
      clearTimeout(contentIdleTimer.current);
      contentIdleTimer.current = null;
    }
  }, [isEditingContent]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      resetTitleIdleTimer();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingContent && contentTextareaRef.current) {
      contentTextareaRef.current.focus();
      resetContentIdleTimer();
    }
  }, [isEditingContent]);

  useEffect(() => {
    const handleGlobalFocusOrClick = (event: FocusEvent | MouseEvent) => {
      const target = (event.target || document.activeElement) as Node | null;
      if (isEditingTitle && titleContainerRef.current && target && !titleContainerRef.current.contains(target)) {
        setIsEditingTitle(false);
      }
      if (isEditingContent && contentContainerRef.current && target && !contentContainerRef.current.contains(target)) {
        setIsEditingContent(false);
      }
    };

    document.addEventListener('focusin', handleGlobalFocusOrClick);
    document.addEventListener('mousedown', handleGlobalFocusOrClick);
    return () => {
      document.removeEventListener('focusin', handleGlobalFocusOrClick);
      document.removeEventListener('mousedown', handleGlobalFocusOrClick);
    };
  }, [isEditingTitle, isEditingContent]);

  const autosaveCandidate = useMemo<Notes>(() => ({
    ...note,
    title: title.trim(),
    content: content.trim(),
    format,
    tags: normalizedTags,
  }), [note, title, content, format, normalizedTags]);

  const saveNote = useCallback(async (candidate: Notes) => {
    if (!candidate.$id) return candidate;
    const payload: Partial<Notes> = {
      title: candidate.title,
      content: candidate.content,
      format: candidate.format,
      tags: candidate.tags,
      isPublic: candidate.isPublic,
      status: candidate.status,
      parentNoteId: candidate.parentNoteId,
      comments: candidate.comments,
      extensions: candidate.extensions,
      collaborators: candidate.collaborators,
      metadata: candidate.metadata,
    };
    const saved = await updateNote(candidate.$id, payload);
    onUpdate(saved);
    return saved;
  }, [onUpdate]);

  const { isSaving: isAutosaving, forceSave } = useAutosave(autosaveCandidate, {
    enabled: !!note.$id,
    debounceMs: 600,
    trigger: 'manual',
    save: saveNote,
    onSave: () => {
      // local state already updated via onUpdate
    },
    onError: (error) => {
      showError('Autosave failed', error?.message || 'Could not sync your note');
    },
  });

  useEffect(() => {
    if (wasEditingRef.current && !isEditing && autosaveCandidate.$id) {
      forceSave(autosaveCandidate);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, autosaveCandidate, forceSave]);

  useEffect(() => {
    return () => {
      if (autosaveCandidate.$id) {
        forceSave(autosaveCandidate);
      }
    };
  }, [autosaveCandidate, forceSave]);

  useEffect(() => {
    if (!isEditing || !note.$id) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const tagsMatch = shallowArrayEqual(note.tags || [], normalizedTags);
    const matchesExisting =
      (note.title || '') === trimmedTitle &&
      (note.content || '') === trimmedContent &&
      (note.format || 'text') === format &&
      tagsMatch;
    if (matchesExisting) return;

    onUpdate({
      ...note,
      title: trimmedTitle,
      content: trimmedContent,
      format,
      tags: normalizedTags,
      updatedAt: new Date().toISOString(),
    });
  }, [isEditing, title, content, format, normalizedTags, note, onUpdate]);

  const handleDoodleSave = (doodleData: string) => {
    setContent(doodleData);
    setShowDoodleEditor(false);
  };

  const activateTitleEditing = () => {
    setIsEditingTitle(true);
  };

  const activateContentEditing = () => {
    setIsEditingContent(true);
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    setAttachmentErrors([]);
    const newErrors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch(`/api/notes/${note.$id}/attachments`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (!res.ok) {
            let errorPayload: any = null;
            try {
              errorPayload = await res.json();
            } catch {
              try {
                errorPayload = { raw: await res.text() };
              } catch {
                errorPayload = { error: `HTTP ${res.status}: ${res.statusText}` };
              }
            }
            const msg = errorPayload?.error || errorPayload?.raw || `Upload failed (${res.status})`;
            newErrors.push(`${file.name}: ${msg}`);
          } else {
            const data = await res.json();
            if (data.attachment) {
              setCurrentAttachments((prev) => [...prev, data.attachment]);
              showSuccess('Attachment added', `${file.name} uploaded successfully`);
            }
          }
        } catch (err: any) {
          newErrors.push(`${file.name}: ${err?.message || 'Upload failed'}`);
        }
      }

      if (newErrors.length > 0) {
        setAttachmentErrors(newErrors);
      }
    } finally {
      setIsUploadingAttachment(false);
      if (e.currentTarget) {
        e.currentTarget.value = '';
      }
    }
  };

  const handleCancel = () => {
    setTitle(note.title || '');
    setContent(note.content || '');
    setFormat((note.format as 'text' | 'doodle') || 'text');
    setTags((note.tags || []).join(', '));
    setIsEditingTitle(false);
    setIsEditingContent(false);
  };

  const handleDelete = () => {
    onDelete(note.$id || '');
    setShowDeleteConfirm(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-end gap-2">
        {showExpandButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenFullPage();
            }}
            className="h-9 w-9 hidden md:inline-flex"
            aria-label="Open full page"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Button>
        )}
        {showHeaderDeleteButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div
        ref={titleContainerRef}
        className="rounded-2xl border border-border bg-card shadow-sm p-4 transition focus-within:ring-2 focus-within:ring-accent/40"
      >
        <div className="flex items-center justify-between text-sm text-muted mb-1">
          <span className="font-medium">Title</span>
          <span className="text-xs text-muted-foreground">Tap to edit</span>
        </div>
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={title || ''}
            onChange={(e) => {
              setTitle(e.target.value);
              resetTitleIdleTimer();
            }}
            onFocus={() => setIsEditingTitle(true)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={activateTitleEditing}
            onFocus={activateTitleEditing}
            className="text-xl font-bold text-foreground cursor-text"
          >
            {displayTitle}
          </div>
        )}
      </div>

      <div
        ref={contentContainerRef}
        className="space-y-3 rounded-2xl border border-border bg-card shadow-sm p-4 transition focus-within:ring-2 focus-within:ring-accent/40"
      >
        <div className="flex items-center justify-between text-sm text-muted">
          <span className="font-medium">Content</span>
          <span className="text-xs text-muted-foreground">Click inside to edit</span>
        </div>
        {isEditingContent ? (
          <div className="space-y-4">
            <div className="flex gap-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setFormat('text')}
                className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  format === 'text'
                    ? 'bg-accent text-white'
                    : 'text-foreground hover:bg-accent/20'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setFormat('doodle')}
                className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  format === 'doodle'
                    ? 'bg-accent text-white'
                    : 'text-foreground hover:bg-accent/20'
                }`}
              >
                Doodle
              </button>
            </div>

            {format === 'text' ? (
              <textarea
                ref={contentTextareaRef}
                value={content || ''}
                onChange={(e) => {
                  setContent(e.target.value);
                  resetContentIdleTimer();
                }}
                rows={12}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              />
            ) : (
              <div className="space-y-3">
                {content ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <NoteContentDisplay
                      content={content}
                      format="doodle"
                      className="w-full"
                      onEditDoodle={() => setShowDoodleEditor(true)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDoodleEditor(true)}
                    className="w-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:bg-accent/5 transition-colors"
                  >
                    <span className="text-sm text-muted">Click to draw</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={activateContentEditing}
            onFocus={activateContentEditing}
            className="space-y-3 cursor-text"
          >
            <NoteContentRenderer
              content={displayContent}
              format={displayFormat}
              textClassName="text-foreground"
              doodleClassName="rounded-lg border border-border mb-2"
              emptyFallback={<span className="italic text-muted">No content</span>}
              onEditDoodle={displayFormat === 'doodle' ? activateContentEditing : undefined}
            />

            {displayFormat !== 'doodle' && displayContent && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onMouseDown={(event) => event.stopPropagation()}
                  onFocus={(event) => event.stopPropagation()}
                  onClick={async (event) => {
                    event.stopPropagation();
                    try {
                      await navigator.clipboard.writeText(displayContent);
                      showSuccess('Copied', 'Content copied to clipboard');
                    } catch (err) {
                      console.error('Failed to copy note content', err);
                      showError('Copy failed', 'Could not copy content to clipboard');
                    }
                  }}
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Tags
        </label>
        {isEditing ? (
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Separate tags with commas"
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
          />
        ) : (
            <div className="flex flex-wrap gap-2">
            {displayTags.map((tag: string, index: number) => (
              <span
                key={`${tag}-${index}`}
                className="px-2 py-1 bg-accent/20 text-accent rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">Attachments</label>
        {isEditing && (
          <div className="mb-3">
            <input
              type="file"
              id="attachment-input"
              multiple
              onChange={handleAttachmentUpload}
              disabled={isUploadingAttachment}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('attachment-input')?.click()}
              disabled={isUploadingAttachment}
              className="w-full"
            >
              <PaperClipIcon className="h-4 w-4 mr-2" />
              {isUploadingAttachment ? 'Uploading...' : 'Add Attachments'}
            </Button>
            {attachmentErrors.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachmentErrors.map((err, i) => (
                  <div key={i} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {currentAttachments.length > 0 ? (
          <ul className="space-y-1 max-h-40 overflow-auto pr-1">
            {currentAttachments.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-xs bg-accent/10 rounded px-2 py-1">
                <div className="flex flex-col min-w-0">
                  <a href={`/notes/${note.$id}/${a.id}`} className="truncate font-medium text-accent hover:underline" title={a.name}>{a.name}</a>
                  <span className="text-[10px] text-muted-foreground">{formatFileSize(a.size)}{a.mime ? ` • ${a.mime}` : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/notes/${note.$id}/${a.id}`}
                    className="text-accent hover:underline"
                    title="Open attachment"
                  >Open</a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted italic">No attachments</p>
        )}
      </div>

      {/* Metadata */}
      <div className="pt-4 border-t border-border space-y-2">
        <div className="text-sm text-muted">
          Created: {formatNoteCreatedDate(note)}
        </div>
        <div className="text-sm text-muted">
          Updated: {formatNoteUpdatedDate(note)}
        </div>

        {enhancedNote?.isSharedWithUser && enhancedNote?.sharedBy && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted">
              <UserIcon className="h-4 w-4" />
              <span>
                Shared by {enhancedNote.sharedBy.name || enhancedNote.sharedBy.email}
              </span>
            </div>
            {enhancedNote.sharePermission && (
              <div className="text-xs text-muted mt-1">
                Permission: {enhancedNote.sharePermission}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="flex flex-col gap-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{isAutosaving ? 'Saving changes…' : 'All changes saved'}</span>
            {isAutosaving && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
          </div>
          <Button variant="ghost" onClick={handleCancel} className="w-full">
            Cancel
          </Button>
        </div>
      )}

      {/* Doodle Editor Modal */}
      {showDoodleEditor && (
        <DoodleCanvas
          initialData={format === 'doodle' ? content : ''}
          onSave={handleDoodleSave}
          onClose={() => setShowDoodleEditor(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Note"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            Are you sure you want to delete &quot;{note.title || 'this note'}&quot;? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
            >
              Delete Note
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
