# GitHub Media Theme System

Complete solution for creating modern 3D animated themes with videos and images hosted on GitHub.

## 📁 Components Created

### 1. **GitHubMediaShowcase** (`components/github-media-showcase.tsx`)
A stunning 3D media showcase component that displays your GitHub-hosted videos and images with:
- Parallax scrolling background
- 3D tilt card effects
- Smooth transitions between media items
- Auto URL conversion (GitHub blob → raw)
- Video controls (play/pause, mute/unmute)
- Thumbnail navigation strip
- Responsive design

### 2. **GitHubMediaManager** (`components/github-media-manager.tsx`)
Admin panel for managing your media gallery:
- Add/remove videos and images
- Preview mode
- Stats dashboard
- Form validation
- Glassmorphic UI design

### 3. **GitHubIntegrationGuide** (`components/github-integration-guide.tsx`)
Step-by-step guide for users:
- How to upload media to GitHub
- URL conversion explanation
- Feature highlights
- Code examples
- Call-to-action sections

### 4. **GitHubThemeStudio** (`components/github-theme-studio.tsx`)
All-in-one studio interface with:
- Tabbed navigation (Manager/Showcase/Guide)
- Device preview toggle (Desktop/Tablet/Mobile)
- Theme color picker (8 preset colors)
- Floating action button
- Responsive mobile tabs

## 🚀 How to Use

### Step 1: Upload Media to GitHub

1. Create a repository on GitHub (or use existing one)
2. Upload your videos (.mp4) and images (.jpg, .png)
3. Navigate to the file on GitHub
4. Copy the URL from browser (blob URL)

Example:
```
https://github.com/username/repo/blob/main/media/project-video.mp4
```

### Step 2: Add to Your Application

#### Option A: Use the Complete Studio
```tsx
import { GitHubThemeStudio } from './components/github-theme-studio';

export default function Page() {
  return <GitHubThemeStudio />;
}
```

#### Option B: Use Individual Components

**Showcase Only:**
```tsx
import { GitHubMediaShowcase } from './components/github-media-showcase';

const mediaItems = [
  {
    id: '1',
    type: 'image', // or 'video'
    url: 'https://github.com/username/repo/blob/main/image.jpg',
    title: 'My Project',
    description: 'Project description here',
    caption: 'Featured'
  }
];

export default function Page() {
  return (
    <GitHubMediaShowcase 
      items={mediaItems}
      themeColor="#6366f1"
      autoPlay={true}
    />
  );
}
```

**Media Manager (Admin Panel):**
```tsx
import { GitHubMediaManager } from './components/github-media-manager';

export default function AdminPage() {
  const handleSave = (items) => {
    // Save to your database/API
    console.log('Saved items:', items);
  };

  return (
    <GitHubMediaManager 
      onSave={handleSave}
      initialItems={[]}
    />
  );
}
```

### Step 3: Customize Theme Colors

The theme color picker includes 8 preset colors:
- Indigo (#6366f1)
- Purple (#8b5cf6)
- Fuchsia (#d946ef)
- Pink (#ec4899)
- Rose (#f43f5e)
- Orange (#f97316)
- Amber (#eab308)
- Green (#22c55e)

You can also pass any custom hex color to `themeColor` prop.

## 🔧 Features

### Automatic URL Conversion
The components automatically convert GitHub blob URLs to raw URLs:
```
Input:  https://github.com/user/repo/blob/main/video.mp4
Output: https://raw.githubusercontent.com/user/repo/main/video.mp4
```

### 3D Effects
- Mouse-follow tilt on cards
- Parallax scrolling backgrounds
- Smooth scale and fade animations
- Glassmorphism blur effects

### Responsive Design
- Desktop, tablet, and mobile views
- Adaptive layouts
- Touch-friendly controls
- Mobile-first approach

### Admin Integration
Ready to integrate with your admin panel:
- Save/load from database
- Permission-based access
- Real-time preview
- Bulk operations support

## 📋 Requirements

Make sure you have these dependencies installed:

```bash
npm install framer-motion lucide-react
```

The components also require:
- Tailwind CSS
- Next.js (for 'use client' directive)
- The `advanced-cards.tsx` component (already created)

## 🎨 Customization

### Modify Card Styles
Edit `components/ui/advanced-cards.tsx` to change:
- Tilt intensity
- Animation durations
- Glass effect opacity
- Border radius

### Change Color Scheme
Update the color array in `GitHubThemeStudio`:
```tsx
['#your-color', '#another-color', ...]
```

### Add More Media Types
Extend the `MediaItem` interface:
```tsx
interface MediaItem {
  id: string;
  type: 'video' | 'image' | 'gif'; // Add more types
  url: string;
  title: string;
  description?: string;
  caption?: string;
}
```

## 📝 Example Data

```tsx
const sampleItems = [
  {
    id: '1',
    type: 'video',
    url: 'https://github.com/user/repo/blob/main/demo.mp4',
    title: 'Product Launch',
    description: 'Our latest product unveiling event',
    caption: 'Keynote 2024'
  },
  {
    id: '2',
    type: 'image',
    url: 'https://github.com/user/repo/blob/main/screenshot.png',
    title: 'Dashboard UI',
    description: 'New analytics dashboard design',
    caption: 'UI/UX Design'
  }
];
```

## 🔗 Integration with Admin Panel

To add this to your existing admin panel:

1. Create new route: `/admin/media-gallery/page.tsx`
2. Import and render `GitHubMediaManager`
3. Connect to your settings API
4. Add permission checks if needed

```tsx
// app/admin/media-gallery/page.tsx
import { GitHubMediaManager } from '@/components/github-media-manager';

export default function MediaGalleryPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <GitHubMediaManager 
        onSave={async (items) => {
          await fetch('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({ mediaGallery: items })
          });
        }}
      />
    </div>
  );
}
```

## 💡 Tips

1. **Use GitHub Releases**: Store media in release assets for better organization
2. **Optimize Images**: Compress images before uploading for faster loading
3. **Video Length**: Keep videos under 50MB for better performance
4. **CDN Alternative**: For production, consider using GitHub Pages or a CDN
5. **Lazy Loading**: Components already implement lazy loading for media

## 🐛 Troubleshooting

**Videos not playing?**
- Ensure video is in MP4 format
- Check if GitHub URL is accessible
- Verify auto-play permissions in browser

**Images not loading?**
- Use direct image URLs (not GitHub page URLs)
- Check file extension (.jpg, .png, .gif)
- Ensure repository is public or properly authenticated

**3D effects not working?**
- Verify `framer-motion` is installed
- Check browser compatibility
- Ensure hardware acceleration is enabled

---

Created with ❤️ for modern web experiences
