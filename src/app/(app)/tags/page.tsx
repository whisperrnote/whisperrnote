'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tags } from '@/types/appwrite';
import { listTags, createTag, updateTag, deleteTag, updateNote } from '@/lib/appwrite';
import { useAuth } from '@/components/ui/AuthContext';
import { formatDateWithFallback } from '@/lib/date-utils';
import { TagNotesListSidebar } from '@/components/ui/TagNotesListSidebar';
import { ID } from 'appwrite';

export default function TagsPage() {
  const { user, isAuthenticated, openIDMWindow } = useAuth();
  const hasFetched = useRef(false);
  const [tags, setTags] = useState<Tags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tags | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tags | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#ffc700', // Default to accent color
  });

  const predefinedColors = [
    '#ffc700', // sun-yellow (accent)
    '#d9a900', // sun-yellow-dark
    '#2d221e', // brown-dark
    '#5d4037', // brown-medium
    '#3c3c3c', // ash-dark
    '#8d6e63', // brown-light
    '#ff5722', // deep orange
    '#4caf50', // green
    '#2196f3', // blue
    '#9c27b0', // purple
    '#e91e63', // pink
    '#00bcd4', // cyan
  ];

  const fetchTags = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      const response = await listTags(); // Uses default user filtering
      setTags(response.documents as unknown as Tags[]);
    } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      openIDMWindow();
      return;
    }
    
    if (user && !hasFetched.current) {
      hasFetched.current = true;
      fetchTags();
    }
  }, [isAuthenticated, user, fetchTags, openIDMWindow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    if (!user) {
      setError('User not authenticated');
      setIsCreating(false);
      return;
    }

    try {
      if (editingTag) {
        // Update existing tag
        await updateTag(editingTag.$id, {
          name: formData.name,
          description: formData.description,
          color: formData.color,
        });
      } else {
        // Create new tag
        await createTag({
          id: ID.unique(),
          userId: user.$id, // Add userId for proper ownership
          name: formData.name,
          description: formData.description,
          color: formData.color,
          notes: [],
          usageCount: 0,
          createdAt: new Date().toISOString(),
        });
      }
      
      // Reset form and refresh tags
      setFormData({ name: '', description: '', color: '#ffc700' });
      setShowCreateForm(false);
      setEditingTag(null);
      await fetchTags();
    } catch (err) {
       setError((err as Error)?.message || 'Failed to save tag');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (tag: Tags) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name || '',
      description: tag.description || '',
      color: tag.color || '#ffc700',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (tag: Tags) => {
    if (!confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      return;
    }

    try {
      await deleteTag(tag.$id);
      await fetchTags();
    } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#ffc700' });
    setShowCreateForm(false);
    setEditingTag(null);
    setError(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent rounded-2xl shadow-3d-light dark:shadow-3d-dark animate-pulse mb-4 mx-auto"></div>
          <p className="text-foreground/70">Please log in to manage your tags</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent rounded-2xl shadow-3d-light dark:shadow-3d-dark animate-pulse mb-4 mx-auto"></div>
          <p className="text-foreground/70">Loading tags...</p>
        </div>
      </div>
    );
  }

  // Show sidebar when a tag is selected
  if (selectedTag) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-screen flex flex-col lg:grid lg:grid-cols-2">
          {/* Desktop: Left side shows tags grid in background */}
          <div className="hidden lg:block overflow-y-auto border-r border-border p-6 animate-fade-in">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Tags Management</h1>
              <p className="text-foreground/70">Organize your notes with custom tags and colors</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-2xl">
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-foreground/60">
                {tags.length} tag{tags.length !== 1 ? 's' : ''} total
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-accent to-accent-dark text-brown-dark px-6 py-3 rounded-2xl font-semibold shadow-3d-light dark:shadow-3d-dark hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-300 hover:scale-105 active:scale-95"
              >
                ✨ Create New Tag
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {tags.map((tag) => (
                <button
                  key={tag.$id}
                  onClick={() => setSelectedTag(tag)}
                  className={`bg-card border-2 rounded-3xl p-6 shadow-3d-light dark:shadow-3d-dark hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-300 hover:scale-105 text-left ${
                    selectedTag?.$id === tag.$id ? 'border-accent' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-lg shadow-sm"
                        style={{ backgroundColor: tag.color || '#ffc700' }}
                      />
                      <h3 className="font-semibold text-foreground text-lg">{tag.name}</h3>
                    </div>
                    <div className="text-xs text-foreground/50 bg-background px-2 py-1 rounded-lg">
                      {tag.usageCount || 0} notes
                    </div>
                  </div>

                  {tag.description && (
                    <p className="text-foreground/70 text-sm mb-4 line-clamp-2">
                      {tag.description}
                    </p>
                  )}

                  <div className="text-xs text-foreground/50 mb-4">
                    Created {formatDateWithFallback(tag.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right side or full screen on mobile: Notes sidebar */}
          <div className="flex-1 overflow-y-auto lg:border-l lg:border-border p-4 lg:p-6 animate-slide-in-right">
            <div className="max-w-4xl h-full">
              <TagNotesListSidebar
                tag={selectedTag}
                onBack={() => setSelectedTag(null)}
                onNoteUpdate={async (updatedNote) => {
                  try {
                    await updateNote(updatedNote.$id || '', updatedNote);
                  } catch (err) {
                    console.error('Failed to update note:', err);
                  }
                }}
                onNoteDelete={(noteId) => {
                  // Handle note deletion if needed
                  console.log('Note deleted:', noteId);
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation Spacing */}
        <div className="h-20 lg:hidden" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop spacing */}
      <div className="">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Tags Management</h1>
            <p className="text-foreground/70">Organize your notes with custom tags and colors</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-2xl">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-foreground/60">
              {tags.length} tag{tags.length !== 1 ? 's' : ''} total
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-accent to-accent-dark text-brown-dark px-6 py-3 rounded-2xl font-semibold shadow-3d-light dark:shadow-3d-dark hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-300 hover:scale-105 active:scale-95"
            >
              ✨ Create New Tag
            </button>
          </div>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-md shadow-3d-light dark:shadow-3d-dark">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {editingTag ? 'Edit Tag' : 'Create New Tag'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Tag Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tag Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-300"
                      placeholder="Enter tag name..."
                      required
                      maxLength={50}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-300 resize-none"
                      placeholder="Describe this tag..."
                      rows={3}
                      maxLength={200}
                    />
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tag Color
                    </label>
                    <div className="grid grid-cols-6 gap-3 mb-4">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-10 h-10 rounded-xl shadow-3d-light dark:shadow-3d-dark transform transition-all duration-200 hover:scale-110 ${
                            formData.color === color ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-12 rounded-2xl border border-border cursor-pointer"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 px-6 py-3 bg-card border border-border text-foreground rounded-2xl font-semibold shadow-3d-light dark:shadow-3d-dark hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !formData.name.trim()}
                      className="flex-1 bg-gradient-to-r from-accent to-accent-dark text-brown-dark px-6 py-3 rounded-2xl font-semibold shadow-3d-light dark:shadow-3d-dark hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? '⏳ Saving...' : editingTag ? '✏️ Update' : '✨ Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tags Grid */}
          {tags.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-accent/10 rounded-3xl shadow-inner-light dark:shadow-inner-dark mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl">🏷️</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No tags yet</h3>
              <p className="text-foreground/60 mb-6">Create your first tag to start organizing your notes</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-accent to-accent-dark text-brown-dark px-6 py-3 rounded-2xl font-semibold shadow-3d-light dark:shadow-3d-dark hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-300 hover:scale-105 active:scale-95"
              >
                ✨ Create First Tag
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tags.map((tag) => (
                <button
                  key={tag.$id}
                  onClick={() => setSelectedTag(tag)}
                  className="bg-card border border-border rounded-3xl p-6 shadow-3d-light dark:shadow-3d-dark hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-300 hover:scale-105 text-left"
                >
                  {/* Tag Color Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-lg shadow-sm"
                        style={{ backgroundColor: tag.color || '#ffc700' }}
                      />
                      <h3 className="font-semibold text-foreground text-lg">{tag.name}</h3>
                    </div>
                    <div className="text-xs text-foreground/50 bg-background px-2 py-1 rounded-lg">
                      {tag.usageCount || 0} notes
                    </div>
                  </div>

                  {/* Description */}
                  {tag.description && (
                    <p className="text-foreground/70 text-sm mb-4 line-clamp-2">
                      {tag.description}
                    </p>
                  )}

                  {/* Created Date */}
                  <div className="text-xs text-foreground/50 mb-4">
                    Created {formatDateWithFallback(tag.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(tag);
                      }}
                      className="flex-1 bg-background text-foreground px-4 py-2 rounded-xl text-sm font-medium border border-border hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tag);
                      }}
                      className="flex-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl text-sm font-medium border border-red-300 dark:border-red-700 hover:shadow-inner-light dark:hover:shadow-inner-dark transform transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Spacing */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
