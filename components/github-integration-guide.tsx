'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Github, Star, GitFork, Users, Zap, Shield, Palette, Layout } from 'lucide-react';
import { Card3D, AnimatedSection, GlassCard } from './ui/advanced-cards';

interface GitHubIntegrationGuideProps {
  repoUrl?: string;
}

export const GitHubIntegrationGuide = ({ 
  repoUrl = 'https://github.com/yourusername/yourrepo' 
}: GitHubIntegrationGuideProps) => {
  
  const features = [
    {
      icon: <Zap className="text-yellow-400" size={24} />,
      title: 'Auto Raw URL Conversion',
      description: 'Automatically converts GitHub blob URLs to raw URLs for direct media access'
    },
    {
      icon: <Shield className="text-emerald-400" size={24} />,
      title: 'Secure Hosting',
      description: 'Your media stays on GitHub\'s secure CDN with fast global delivery'
    },
    {
      icon: <Palette className="text-purple-400" size={24} />,
      title: 'Theme Integration',
      description: 'Seamlessly integrates with your admin panel theme settings'
    },
    {
      icon: <Layout className="text-blue-400" size={24} />,
      title: 'Responsive Layouts',
      description: 'Beautiful 3D cards that adapt to any screen size perfectly'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Upload Media to GitHub',
      description: 'Upload your videos (.mp4) and images (.jpg, .png) to your GitHub repository',
      code: `# Example structure
your-repo/
├── media/
│   ├── project1-video.mp4
│   ├── project1-thumb.jpg
│   └── project2-image.png`
    },
    {
      step: '02',
      title: 'Get the Blob URL',
      description: 'Navigate to the file on GitHub and copy the URL from your browser',
      code: `https://github.com/username/repo/blob/main/media/video.mp4
      ↓ Auto-converts to ↓
https://raw.githubusercontent.com/username/repo/main/media/video.mp4`
    },
    {
      step: '03',
      title: 'Add to Media Manager',
      description: 'Paste the GitHub URL in the admin panel media manager',
      code: `// In Admin Panel
1. Go to /admin/media-gallery
2. Click "Add New Media Item"
3. Paste GitHub URL
4. Add title & description
5. Save`
    },
    {
      step: '04',
      title: 'View on Website',
      description: 'Your media appears in the 3D showcase with animations',
      code: `// The component handles everything:
- URL conversion
- Lazy loading
- 3D tilt effects
- Smooth transitions
- Responsive layout`
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white py-20">
      <div className="container mx-auto px-4">
        
        {/* Hero Section */}
        <AnimatedSection animation="fade-up" className="text-center mb-20">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm font-medium mb-6"
          >
            <Github size={16} />
            GitHub Integration Guide
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Host Media on GitHub
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Use GitHub as your free, fast, and reliable CDN for videos and images. 
            Perfect for portfolios, project showcases, and product demos.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <Github size={20} />
              View Repository
            </a>
            <button className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 transition-all flex items-center gap-2">
              <Star size={20} className="text-yellow-500" />
              Star on GitHub
            </button>
          </div>
        </AnimatedSection>

        {/* Features Grid */}
        <AnimatedSection animation="fade-up" className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 bg-gray-900/50 border-gray-800 hover:border-indigo-500/50 transition-all h-full">
                  <div className="mb-4 p-3 rounded-lg bg-gray-800 w-fit">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>

        {/* Step by Step Guide */}
        <AnimatedSection animation="slide-right" className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Card3D className="bg-gray-900/40 border-gray-800 overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* Content Side */}
                    <div className="p-8 relative">
                      <div className="absolute top-4 right-4 text-6xl font-bold text-white/5 select-none">
                        {step.step}
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold">
                            STEP {step.step}
                          </span>
                        </div>
                        
                        <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                        <p className="text-gray-400 mb-6">{step.description}</p>
                        
                        {index === 0 && (
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <GitFork size={14} />
                              <span>Fork this repo</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={14} />
                              <span>Collaborate easily</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Code Side */}
                    <div className="bg-black/50 p-6 overflow-x-auto border-t md:border-t-0 md:border-l border-gray-800">
                      <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                        <code>{step.code}</code>
                      </pre>
                    </div>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>

        {/* Quick Start CTA */}
        <AnimatedSection animation="scale-up" className="text-center">
          <GlassCard className="p-12 bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50 border-indigo-500/30">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Upload your first media file to GitHub and see it come alive with 3D animations 
              in just minutes. No complex setup required.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <button className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-500/25">
                Open Media Manager
              </button>
              <button className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold transition-all">
                View Documentation
              </button>
            </div>
          </GlassCard>
        </AnimatedSection>

      </div>
    </div>
  );
};
