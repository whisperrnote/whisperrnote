'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Extensions } from '@/types/appwrite';
import { listExtensions, createExtension, updateExtension, getCurrentUser } from '@/lib/appwrite';

interface ExtensionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  hooks: string[];
   settings: Record<string, unknown>;
  code: string;
}

const extensionTemplates: ExtensionTemplate[] = [
  {
    id: 'note-revisor',
    name: 'AI Note Revisor',
    description: 'Automatically revise and improve notes using AI when they are created',
    icon: '🧠',
    category: 'AI Enhancement',
    hooks: ['onCreate'],
    settings: {
      aiProvider: 'gemini',
      revisionPrompt: 'Improve this note by fixing grammar, enhancing clarity, and organizing content better:',
      autoApply: true
    },
    code: `// AI Note Revisor Extension
export default {
  name: 'AI Note Revisor',
  version: '1.0.0',
  hooks: {
    onCreate: async (note, settings) => {
      if (!settings.autoApply) return note;
      
      const prompt = \`\${settings.revisionPrompt}\\n\\n\${note.content}\`;
      const revisedContent = await callAI(prompt, settings.aiProvider);
      
      return {
        ...note,
        content: revisedContent,
        metadata: JSON.stringify({
          ...JSON.parse(note.metadata || '{}'),
          revisedBy: 'AI Note Revisor',
          originalContent: note.content
        })
      };
    }
  }
};`
  },
  {
    id: 'auto-tagger',
    name: 'Smart Auto-Tagger',
    description: 'Automatically extract and add relevant tags to notes based on content',
    icon: '⚡',
    category: 'Organization',
    hooks: ['onCreate', 'onUpdate'],
    settings: {
      maxTags: 5,
      minConfidence: 0.7,
      customKeywords: []
    },
    code: `// Smart Auto-Tagger Extension
export default {
  name: 'Smart Auto-Tagger',
  version: '1.0.0',
  hooks: {
    onCreate: async (note, settings) => {
      const extractedTags = await extractTags(note.content, settings);
      return {
        ...note,
        tags: [...(note.tags || []), ...extractedTags]
      };
    }
  }
};`
  },
  {
    id: 'security-scanner',
    name: 'Security Scanner',
    description: 'Scan notes for sensitive information and apply additional encryption',
    icon: '🛡️',
    category: 'Security',
    hooks: ['onCreate', 'onUpdate'],
    settings: {
      sensitivePatterns: ['ssn', 'credit-card', 'api-key'],
      autoEncrypt: true,
      alertUser: true
    },
    code: `// Security Scanner Extension
export default {
  name: 'Security Scanner',
  version: '1.0.0',
  hooks: {
    onCreate: async (note, settings) => {
      const sensitiveData = scanForSensitiveData(note.content, settings.sensitivePatterns);
      
      if (sensitiveData.length > 0) {
        if (settings.alertUser) {
          showSecurityAlert(sensitiveData);
        }
        
        if (settings.autoEncrypt) {
          const encryptedContent = await encryptSensitiveData(note.content, sensitiveData);
          return {
            ...note,
            content: encryptedContent
          };
        }
      }
      
      return note;
    }
  }
};`
  }
];

export default function ExtensionsPage() {
  const [extensions, setExtensions] = useState<Extensions[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExtensionTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed' | 'templates'>('marketplace');
  const [loading, setLoading] = useState(true);
   const [user, setUser] = useState<{ $id?: string } | null>(null);

  useEffect(() => {
    loadExtensions();
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadExtensions = async () => {
    try {
      setLoading(true);
      const result = await listExtensions();
      setExtensions(result.documents as unknown as Extensions[]);
    } catch (error) {
      console.error('Failed to load extensions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExtension = async (extensionData: Partial<Extensions>) => {
    try {
      await createExtension({
        ...extensionData,
        authorId: user?.$id,
        enabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await loadExtensions();
      setIsCreateModalOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to create extension:', error);
    }
  };

  const handleToggleExtension = async (extension: Extensions) => {
    try {
      await updateExtension(extension.$id!, {
        enabled: !extension.enabled
      });
      await loadExtensions();
    } catch (error) {
      console.error('Failed to toggle extension:', error);
    }
  };

  const filteredExtensions = extensions.filter(ext =>
    ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ext.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const installedExtensions = extensions.filter(ext => ext.enabled);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Extensions Marketplace
            </h1>
            <p className="text-muted">
              Extend Whisperrnote with powerful plugins and automations
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <span className="mr-2">+</span>
            Create Extension
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'marketplace', label: 'Marketplace', count: extensions.length },
            { id: 'installed', label: 'Installed', count: installedExtensions.length },
            { id: 'templates', label: 'Templates', count: extensionTemplates.length }
          ].map((tab) => (
            <button
              key={tab.id}
               onClick={() => setActiveTab(tab.id as 'marketplace' | 'installed' | 'templates')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-foreground'
              }` }
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'marketplace' && filteredExtensions.map((extension) => (
              <ExtensionCard
                key={extension.$id}
                extension={extension}
                onToggle={handleToggleExtension}
                isOwner={extension.authorId === user?.$id}
              />
            ))}

            {activeTab === 'installed' && installedExtensions.map((extension) => (
              <ExtensionCard
                key={extension.$id}
                extension={extension}
                onToggle={handleToggleExtension}
                isOwner={extension.authorId === user?.$id}
              />
            ))}

            {activeTab === 'templates' && extensionTemplates
              .filter(template =>
                template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => {
                    setSelectedTemplate(template);
                    setIsCreateModalOpen(true);
                  }}
                />
              ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && (
          (activeTab === 'marketplace' && filteredExtensions.length === 0) ||
          (activeTab === 'installed' && installedExtensions.length === 0) ||
          (activeTab === 'templates' && extensionTemplates.length === 0)
        ) && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-muted mb-2">
              {activeTab === 'marketplace' && 'No extensions found'}
              {activeTab === 'installed' && 'No extensions installed'}
              {activeTab === 'templates' && 'No templates available'}
            </h3>
            <p className="text-muted">
              {activeTab === 'marketplace' && 'Try adjusting your search or create a new extension'}
              {activeTab === 'installed' && 'Browse the marketplace to install extensions'}
              {activeTab === 'templates' && 'Check back later for new templates'}
            </p>
          </div>
        )}
      </div>

      {/* Create Extension Modal */}
      <CreateExtensionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedTemplate(null);
        }}
        onSubmit={handleCreateExtension}
        template={selectedTemplate}
      />
    </div>
  );
}

function ExtensionCard({ extension, onToggle, isOwner }: {
  extension: Extensions;
  onToggle: (extension: Extensions) => void;
  isOwner: boolean;
}) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">📦</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{extension.name}</h3>
            <p className="text-sm text-muted">v{extension.version}</p>
          </div>
        </div>
        {isOwner && (
          <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
            Owner
          </span>
        )}
      </div>

      <p className="text-muted text-sm mb-4 line-clamp-3">
        {extension.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-muted">
          <span>👤</span>
          <span>Author</span>
        </div>
        <Button
          onClick={() => onToggle(extension)}
          variant={extension.enabled ? "destructive" : "default"}
          size="sm"
        >
          {extension.enabled ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  );
}

function TemplateCard({ template, onUse }: {
  template: ExtensionTemplate;
  onUse: () => void;
}) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">{template.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{template.name}</h3>
            <p className="text-sm text-muted">{template.category}</p>
          </div>
        </div>
        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
          Template
        </span>
      </div>

      <p className="text-light-600 dark:text-dark-300 text-sm mb-4 line-clamp-3">
        {template.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {template.hooks.map((hook) => (
          <span
            key={hook}
            className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full"
          >
            {hook}
          </span>
        ))}
      </div>

      <Button onClick={onUse} className="w-full" variant="outline">
        <span className="mr-2">⬇️</span>
        Use Template
      </Button>
    </div>
  );
}

function CreateExtensionModal({ isOpen, onClose, onSubmit, template }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Extensions>) => void;
  template?: ExtensionTemplate | null;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    settings: '{}',
    enabled: false
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        version: '1.0.0',
        settings: JSON.stringify(template.settings, null, 2),
        enabled: false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        version: '1.0.0',
        settings: '{}',
        enabled: false
      });
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Extension">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-light-700 dark:text-dark-300 mb-2">
            Extension Name
          </label>
          <Input
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Awesome Extension"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-700 dark:text-dark-300 mb-2">
            Description
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what your extension does..."
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-700 dark:text-dark-300 mb-2">
            Version
          </label>
          <Input
            required
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="1.0.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-700 dark:text-dark-300 mb-2">
            Settings (JSON)
          </label>
          <textarea
            value={formData.settings}
            onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
            placeholder='{"setting1": "value1"}'
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground font-mono text-sm"
            rows={6}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
            Create Extension
          </Button>
        </div>
      </form>
    </Modal>
  );
}