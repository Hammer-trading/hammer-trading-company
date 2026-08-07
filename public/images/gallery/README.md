# Gallery Images Folder

## How to Add Your Images/Videos:

### Option 1: Local Upload
1. Upload your images/videos to this folder: `/workspace/public/images/gallery/`
2. Reference them in your gallery page like this:
```typescript
{
  id: "3",
  src: "/images/gallery/your-image.jpg",
  alt: "Your image description",
  title: "Image Title",
  description: "Image description",
  type: "image", // or "video" for .mp4/.webm files
  category: "projects",
}
```

### Option 2: GitHub Raw URLs (Recommended)
1. Upload images/videos to your GitHub repository
2. Use the raw URL format:
```typescript
{
  id: "3",
  src: "https://raw.githubusercontent.com/your-username/your-repo/main/path/to/image.jpg",
  alt: "Your image description",
  title: "Image Title",
  description: "Image description",
  type: "image",
  category: "projects",
}
```

### Supported Formats:
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **Videos**: `.mp4`, `.webm`

### Categories You Can Use:
- `workspace` - Workshop/office setups
- `branding` - Logos and brand materials
- `projects` - Client projects
- `products` - Product photos
- `events` - Events and exhibitions
- `team` - Team photos
- Or create your own custom categories!

## Example Gallery Configuration:

```typescript
const galleryItems: MediaItem[] = [
  {
    id: "1",
    src: "/images/gallery/project1.jpg",
    alt: "Project 1",
    title: "Amazing Project",
    description: "Description of the project",
    type: "image",
    category: "projects",
  },
  {
    id: "2",
    src: "https://raw.githubusercontent.com/user/repo/main/video.mp4",
    alt: "Demo video",
    title: "Product Demo",
    description: "Watch our product in action",
    type: "video",
    category: "products",
  },
];
```
