'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Github, 
  Plus,
  Settings, 
  Palette, 
  Monitor, 
  Smartphone, 
  Tablet 
} from 'lucide-react';
import { GitHubMediaShowcase } from './github-media-showcase';
import { GitHubMediaManager } from './github-media-manager';
import { GitHubIntegrationGuide } from './github-integration-guide';

interface MediaItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  title: string;
  description?: string;
  caption?: string;
}

export const GitHubThemeStudio = () => {
  type ActiveTab = 'manager' | 'showcase' | 'guide';
  const [activeTab, setActiveTab] = useState<ActiveTab>('manager');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [themeColor, setThemeColor] = useState('#6366f1');
  
  // Sample data for demo
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([
    {
      id: '1',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800',
      title: 'Project Alpha',
      description: 'A revolutionary approach to modern web development with 3D animations',
      caption: 'Featured Project'
    },
    {
      id: '2',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      title: 'Product Demo',
      description: 'Watch our product in action with smooth transitions and effects',
      caption: 'Video Showcase'
    }
  ]);

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'manager', label: 'Media Manager', icon: <Settings size={18} /> },
    { id: 'showcase', label: 'Live Showcase', icon: <Monitor size={18} /> },
    { id: 'guide', label: 'Integration Guide', icon: <Github size={18} /> }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation Bar */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Github size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">GitHub Theme Studio</h1>
                <p className="text-xs text-gray-400">Create stunning media showcases</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Device Preview Toggle */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1 bg-gray-900/50 p-1 rounded-lg">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 rounded-md transition-all ${
                    previewDevice === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Desktop View"
                >
                  <Monitor size={16} />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-2 rounded-md transition-all ${
                    previewDevice === 'tablet' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Tablet View"
                >
                  <Tablet size={16} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 rounded-md transition-all ${
                    previewDevice === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone size={16} />
                </button>
              </div>
              
              {/* Theme Color Picker */}
              <div className="relative group">
                <button className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 transition-all">
                  <Palette size={18} className="text-indigo-400" />
                </button>
                <div className="absolute right-0 top-full mt-2 p-3 bg-gray-900 rounded-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl">
                  <div className="grid grid-cols-4 gap-2">
                    {['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setThemeColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                          themeColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'manager' && (
            <motion.div
              key="manager"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GitHubMediaManager 
                onSave={setMediaItems}
                initialItems={mediaItems}
              />
            </motion.div>
          )}

          {activeTab === 'showcase' && (
            <motion.div
              key="showcase"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto"
              style={{
                maxWidth: previewDevice === 'mobile' ? '400px' : previewDevice === 'tablet' ? '768px' : '100%'
              }}
            >
              <GitHubMediaShowcase 
                items={mediaItems}
                themeColor={themeColor}
                autoPlay={true}
              />
            </motion.div>
          )}

          {activeTab === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GitHubIntegrationGuide />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/50 flex items-center justify-center z-50"
        onClick={() => setActiveTab('manager')}
      >
        <Plus size={24} />
      </motion.button>
    </div>
  );
};
