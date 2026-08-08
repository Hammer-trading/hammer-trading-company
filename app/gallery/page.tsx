import type { Metadata } from "next";
import { MediaThemeStudio } from "@/components/ui/media-theme-studio";
import type { MediaItem } from "@/components/ui/media-gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { 
  title: "Media Gallery | Hammer Trading Company", 
  description: "Explore our collection of projects, installations, and media with modern 3D animated themes" 
};

// Sample media items - Replace these with your actual images/videos
const galleryItems: MediaItem[] = [
  {
    id: "1",
    src: "/brand/workshop-hero.webp",
    alt: "Workshop scene",
    title: "Workshop Setup",
    description: "Professional hardware installation workspace",
    type: "image",
    category: "workspace",
  },
  {
    id: "2",
    src: "/brand/htc-logo.png",
    alt: "HTC Logo",
    title: "Brand Identity",
    description: "Hammer Trading Company branding",
    type: "image",
    category: "branding",
  },
  // Add your GitHub or local images/videos here:
  // {
  //   id: "3",
  //   src: "https://raw.githubusercontent.com/your-username/your-repo/main/image.jpg",
  //   alt: "Project image",
  //   title: "Project Name",
  //   description: "Project description",
  //   type: "image",
  //   category: "projects",
  // },
];

export default function GalleryPage() {
  return <MediaThemeStudio showAdminControls={true} initialItems={galleryItems} />;
}
