# 🖼️ Gallery Setup Guide - Hammer Trading Company

## ✅ Already Implemented Features:

Your gallery already has:
- ✨ **3D Animated Cards** with mouse-follow tilt effects
- 🎨 **6 Theme Presets** (Industrial, Minimal, Ocean, Sunset, Forest, Cyberpunk)
- 📐 **4 Layout Options** (Grid, Masonry, Carousel, Showcase)
- 🏷️ **Category Filters** for organizing content
- 🔍 **Lightbox Modal** for full-screen viewing
- 🎬 **Video Support** (MP4, WebM)
- 📱 **Responsive Design** for all devices
- ⚡ **Framer Motion Animations**
- 💎 **Glassmorphism Effects**
- 🎛️ **Admin Controls** (theme switcher, layout selector, column control)

## 📁 Your Images Location:

Current images in your project:
- `/workspace/public/brand/workshop-hero.webp` - Workshop hero image
- `/workspace/public/brand/htc-logo.png` - Company logo

New gallery folder created:
- `/workspace/public/images/gallery/` - Upload your images here

## 🚀 How to Add Your GitHub Images/Videos:

### Step 1: Upload to GitHub
1. Go to your GitHub repository
2. Upload images/videos to any folder (e.g., `images/`, `media/`)
3. Commit the changes

### Step 2: Get Raw URLs
Convert GitHub URL to raw URL:
- ❌ Regular: `https://github.com/user/repo/blob/main/image.jpg`
- ✅ Raw: `https://raw.githubusercontent.com/user/repo/main/image.jpg`

**Note:** Change `blob` to `raw` and remove `/blob/` from the URL!

### Step 3: Update Gallery Page
Edit `/workspace/app/gallery/page.tsx`:

```typescript
const galleryItems: MediaItem[] = [
  // Your existing items...
  
  // Add new GitHub images:
  {
    id: "3",
    src: "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/path/to/image1.jpg",
    alt: "Project showcase",
    title: "Amazing Project",
    description: "Check out this awesome project",
    type: "image",
    category: "projects",
  },
  {
    id: "4",
    src: "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/path/to/video.mp4",
    alt: "Product demo",
    title: "Product Demo Video",
    description: "See our product in action",
    type: "video",
    category: "products",
  },
  // Add more items as needed...
];
```

## 📋 Supported Media Types:

| Type | Formats | Example |
|------|---------|---------|
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | `photo.jpg` |
| Videos | `.mp4`, `.webm` | `demo.mp4` |

## 🏷️ Category Ideas:

Use these categories or create your own:
- `workspace` - Office/workshop setups
- `branding` - Logos and brand materials  
- `projects` - Client projects
- `products` - Product photos
- `events` - Events and exhibitions
- `team` - Team photos
- `installations` - Hardware installations
- `before-after` - Transformation photos

## 🎨 Using the Admin Controls:

Visit `/gallery` page and use the floating control panel:

1. **Theme Selector** - Choose from 6 color themes
2. **Layout Selector** - Switch between Grid/Masonry/Carousel/Showcase
3. **Columns Slider** - Adjust grid columns (1-4)
4. **Filters Toggle** - Show/hide category filters
5. **Preview Mode** - Hide controls for clean preview

## 🔧 Advanced Customization:

### Change Hero Image:
Edit `MediaHero` component in `/workspace/components/ui/media-theme-studio.tsx`:
```typescript
<MediaHero
  backgroundImage="/brand/workshop-hero.webp" // Change this
  title="Media Gallery"
  subtitle="Explore our collection"
/>
```

### Add More Themes:
Add new theme presets in `/workspace/components/ui/media-theme-studio.tsx`:
```typescript
const themePresets: ThemePreset[] = [
  // ...existing themes
  {
    id: "custom",
    name: "My Custom Theme",
    colors: {
      primary: "#your-color",
      secondary: "#your-color",
      accent: "#your-color",
      background: "#your-color",
      cardBg: "#your-color",
      textPrimary: "#your-color",
      textSecondary: "#your-color",
    },
    borderRadius: "rounded-xl",
    shadowIntensity: "medium",
    animationSpeed: "normal",
  },
];
```

## 📱 Mobile Optimization:

The gallery is fully responsive:
- **Mobile**: 1 column, touch-friendly controls
- **Tablet**: 2 columns
- **Desktop**: 3-4 columns (adjustable)

## 🎯 Quick Test:

1. Navigate to: `http://localhost:3000/gallery`
2. You should see:
   - Parallax hero section
   - 2 sample media cards (workshop + logo)
   - Floating admin controls (top-right)
   - Category filters (if multiple categories exist)

## ❓ Troubleshooting:

### Images Not Loading?
- Check if URL is correct (use raw GitHub URLs)
- Ensure file extension matches (.jpg vs .jpeg)
- Try opening image URL directly in browser

### Videos Not Playing?
- Use MP4 or WebM format only
- Check video codec compatibility
- Ensure video file isn't corrupted

### Animations Too Fast/Slow?
- Change `animationSpeed` in theme preset: `"slow" | "normal" | "fast"`
- Or customize duration in `getAnimationDuration()` function

## 📞 Need Help?

Your gallery is ready! Just:
1. Upload images to GitHub
2. Copy raw URLs
3. Add to `galleryItems` array
4. Enjoy your modern 3D animated gallery! 🎉
