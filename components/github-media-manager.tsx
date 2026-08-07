'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Video, Image as ImageIcon, Github, Save, Eye } from 'lucide-react';
import { GlassCard } from './ui/advanced-cards';

interface MediaItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  title: string;
  description?: string;
  caption?: string;
}

interface GitHubMediaManagerProps {
  onSave?: (items: MediaItem[]) => void;
  initialItems?: MediaItem[];
}

export const GitHubMediaManager = ({ 
  onSave, 
  initialItems = [] 
}: GitHubMediaManagerProps) => {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [isAdding, setIsAdding] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  const [newItem, setNewItem] = useState<Omit<MediaItem, 'id'>>({
    type: 'video',
    url: '',
    title: '',
    description: '',
    caption: ''
  });

  const handleAddItem = () => {
    if (!newItem.url || !newItem.title) return;
    
    const item: MediaItem = {
      id: Date.now().toString(),
      ...newItem
    };
    
    setItems([...items, item]);
    setNewItem({ type: 'video', url: '', title: '', description: '', caption: '' });
    setIsAdding(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = () => {
    onSave?.(items);
    // In a real app, this would save to database via API
    alert('Media gallery saved! Items: ' + items.length);
  };

  // Helper to show example URLs
  const exampleUrls = {
    video: 'https://github.com/user/repo/blob/main/video.mp4',
    image: 'https://github.com/user/repo/blob/main/image.jpg'
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Github className="text-indigo-500" />
              GitHub Media Manager
            </h1>
            <p className="text-gray-400 mt-2">
              Manage videos and images hosted on GitHub for your 3D showcase
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center gap-2 transition-all"
            >
              <Eye size={18} />
              {previewMode ? 'Edit Mode' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 transition-all font-medium"
            >
              <Save size={18} />
              Save Gallery
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard className="p-6 bg-gray-900/50 border-gray-800">
            <div className="text-3xl font-bold text-indigo-400">{items.length}</div>
            <div className="text-gray-400">Total Media Items</div>
          </GlassCard>
          <GlassCard className="p-6 bg-gray-900/50 border-gray-800">
            <div className="text-3xl font-bold text-emerald-400">
              {items.filter(i => i.type === 'video').length}
            </div>
            <div className="text-gray-400">Videos</div>
          </GlassCard>
          <GlassCard className="p-6 bg-gray-900/50 border-gray-800">
            <div className="text-3xl font-bold text-pink-400">
              {items.filter(i => i.type === 'image').length}
            </div>
            <div className="text-gray-400">Images</div>
          </GlassCard>
        </div>

        {!previewMode ? (
          <>
            {/* Add New Item Form */}
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <GlassCard className="p-6 bg-gray-900/80 border-indigo-500/30">
                  <h3 className="text-xl font-semibold mb-4">Add New Media</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Type</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setNewItem({ ...newItem, type: 'video' })}
                          className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                            newItem.type === 'video' 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          <Video size={18} />
                          Video
                        </button>
                        <button
                          onClick={() => setNewItem({ ...newItem, type: 'image' })}
                          className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                            newItem.type === 'image' 
                              ? 'bg-pink-600 text-white' 
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          <ImageIcon size={18} />
                          Image
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        GitHub URL {newItem.type === 'video' ? '(MP4)' : '(JPG/PNG)'}
                      </label>
                      <input
                        type="url"
                        value={newItem.url}
                        onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                        placeholder={exampleUrls[newItem.type]}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-indigo-500 outline-none transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use GitHub blob URL, will auto-convert to raw
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Title *</label>
                    <input
                      type="text"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Project Title"
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Project description..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-indigo-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">Caption</label>
                    <input
                      type="text"
                      value={newItem.caption}
                      onChange={(e) => setNewItem({ ...newItem, caption: e.target.value })}
                      placeholder="Short caption or tagline"
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAddItem}
                      disabled={!newItem.url || !newItem.title}
                      className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium transition-all"
                    >
                      Add to Gallery
                    </button>
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Add Button */}
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-3 mb-8 group"
              >
                <Plus className="group-hover:scale-110 transition-transform" />
                <span className="font-medium">Add New Media Item</span>
              </button>
            )}

            {/* Media List */}
            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-20">
                  <Github size={64} className="mx-auto text-gray-700 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-500">No media items yet</h3>
                  <p className="text-gray-600 mt-2">Add your first GitHub-hosted video or image</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GlassCard className="p-4 bg-gray-900/50 border-gray-800 hover:border-indigo-500/50 transition-all group">
                      <div className="flex items-center gap-4">
                        {/* Thumbnail Preview */}
                        <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
                          {item.type === 'video' ? (
                            <video src={item.url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')} className="w-full h-full object-cover" alt={item.title} />
                          )}
                          <div className="absolute top-1 right-1 px-2 py-0.5 rounded bg-black/70 text-xs">
                            {item.type === 'video' ? <Video size={12} /> : <ImageIcon size={12} />}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{item.title}</h4>
                          <p className="text-sm text-gray-400 truncate">{item.description || 'No description'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              item.type === 'video' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-pink-500/20 text-pink-400'
                            }`}>
                              {item.type.toUpperCase()}
                            </span>
                            {item.caption && (
                              <span className="text-xs text-gray-500">{item.caption}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Preview Mode - Shows the actual showcase component */
          <div className="mt-8">
            <p className="text-center text-gray-400 mb-4">Preview Mode - This is how it will look on your site</p>
            {/* Here you would import and render GitHubMediaShowcase with the items */}
            <GlassCard className="p-20 text-center border-indigo-500/30">
              <Eye size={48} className="mx-auto text-indigo-400 mb-4" />
              <h3 className="text-xl font-semibold">Live Preview</h3>
              <p className="text-gray-400 mt-2">
                The showcase will display {items.length} media items with 3D animations
              </p>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};
