export const STOREFRONT_THEMES = [
  {
    id: "industrial",
    name: "HTC Industrial",
    description: "The original product-first HTC showroom with graphite, steel and red accents.",
    colors: ["#f5f6f3", "#20262a", "#d51f2c"]
  },
  {
    id: "apple",
    name: "Apple Store",
    description: "Quiet whitespace, precise glass surfaces and a premium product-gallery feel.",
    colors: ["#f5f5f7", "#ffffff", "#0071e3"]
  },
  {
    id: "commerce",
    name: "Commerce Pro",
    description: "A compact, conversion-focused catalogue with strong pricing and stock hierarchy.",
    colors: ["#f2f4f5", "#ffffff", "#d51f2c"]
  },
  {
    id: "atelier",
    name: "Atelier Clean",
    description: "Editorial spacing, crisp typography and refined showroom presentation.",
    colors: ["#f3f7f6", "#ffffff", "#0f766e"]
  },
  {
    id: "horizon",
    name: "Horizon Glass",
    description: "Advanced luminous panels, steel-blue details and controlled glass depth.",
    colors: ["#f2f7f9", "#ffffff", "#16758b"]
  },
  {
    id: "forge",
    name: "Forge Glass",
    description: "Premium smoked-metal surfaces, liquid reflections and focused crimson actions.",
    colors: ["#eef0f1", "#17191c", "#c92332"]
  },
  {
    id: "blueprint",
    name: "Blueprint Grid",
    description: "Technical Swiss structure, blueprint lines and precise cobalt product hierarchy.",
    colors: ["#f1f5f8", "#0e315c", "#1769aa"]
  },
  {
    id: "workbench",
    name: "Workbench",
    description: "Compact professional retail surfaces with zinc neutrals and safety-yellow signals.",
    colors: ["#f4f4f5", "#18181b", "#d6a900"]
  },
  {
    id: "foundry3d",
    name: "Foundry 3D",
    description: "Dimensional product stages, layered graphite depth and performance-safe perspective motion.",
    colors: ["#eef1f3", "#11171b", "#e03127"]
  },
  {
    id: "axonometric",
    name: "Axonometric Yard",
    description: "Architectural product blocks, isometric elevation and engineered cobalt-orange contrast.",
    colors: ["#eef2f4", "#14212b", "#176fa6"]
  },
  {
    id: "prism3d",
    name: "Prism Depth",
    description: "Pearl surfaces, chromatic edge depth and cinematic product focus without heavy rendering.",
    colors: ["#f2f5f4", "#10191b", "#087f78"]
  },
  {
    id: "crucible",
    name: "Crucible Spatial",
    description: "Architectural spatial staging with meridian guides, layered planes and calibrated product depth.",
    colors: ["#e9eeef", "#0f171a", "#0ea5a4"]
  }
] as const;

export const STOREFRONT_LAYOUTS = [
  {
    id: "showroom",
    name: "Showroom",
    description: "The balanced HTC structure with five-column shelves and clear service chapters.",
    signature: "Balanced"
  },
  {
    id: "gallery",
    name: "Gallery Stage",
    description: "Large product imagery, wider cards and generous premium breathing room.",
    signature: "Visual"
  },
  {
    id: "catalog",
    name: "Pro Catalog",
    description: "Dense product discovery with compact shelves, filters and pricing hierarchy.",
    signature: "Dense"
  },
  {
    id: "editorial",
    name: "Editorial Flow",
    description: "Asymmetric product rhythm with feature cards and strong section storytelling.",
    signature: "Asymmetric"
  },
  {
    id: "bento",
    name: "Bento Workshop",
    description: "Modular product tiles with varied spans and organized visual chapters.",
    signature: "Modular"
  },
  {
    id: "immersive",
    name: "Immersive Showcase",
    description: "Full-width hero impact followed by fewer, larger product stages.",
    signature: "Cinematic"
  },
  {
    id: "split",
    name: "Split Commerce",
    description: "Alternating product rows and service panels optimized for comparison.",
    signature: "Comparative"
  },
  {
    id: "spatial",
    name: "Spatial Staging",
    description: "Architectural depth planes with meridian guides for spatial product configuration.",
    signature: "Architectural"
  }
] as const;

export const STOREFRONT_INTERFACES = [
  {
    id: "foundry-cinema",
    theme: "foundry3d",
    layout: "immersive",
    name: "Foundry Cinema",
    description: "A complete dark cinematic showroom with full-width stages, industrial navigation and dramatic product chapters.",
    signature: "Cinematic / dark",
    colors: ["#080d10", "#1a252b", "#ef3024"]
  },
  {
    id: "axonometric-workshop",
    theme: "axonometric",
    layout: "bento",
    name: "Axonometric Workshop",
    description: "A modular technical store with isometric category blocks, workbench navigation and compact product comparison.",
    signature: "Modular / technical",
    colors: ["#e8eef0", "#14212b", "#176fa6"]
  },
  {
    id: "prism-gallery",
    theme: "prism3d",
    layout: "editorial",
    name: "Prism Gallery",
    description: "A luminous editorial commerce system with floating surfaces, asymmetric product stories and calm premium motion.",
    signature: "Editorial / luminous",
    colors: ["#edf3f1", "#101b1c", "#087f78"]
  },
  {
    id: "crucible-meridian",
    theme: "crucible",
    layout: "spatial",
    name: "Crucible Meridian",
    description: "A spatial product configurator with meridian lines, layered depth planes and architectural product staging.",
    signature: "Spatial / architectural",
    colors: ["#e9eeef", "#0f171a", "#0ea5a4"]
  }
] as const;

export const ADMIN_UI_THEMES = [
  {
    id: "operations",
    name: "Operations",
    description: "The current HTC operational dashboard with charcoal navigation and red actions.",
    colors: ["#f4f5f7", "#111419", "#dc2626"]
  },
  {
    id: "carbon",
    name: "Carbon Console",
    description: "Sharper, denser control surfaces with black steel and technical cyan details.",
    colors: ["#eef2f4", "#070a0c", "#1596a8"]
  },
  {
    id: "workspace",
    name: "Studio Workspace",
    description: "A calmer bright workspace with soft steel navigation and generous information spacing.",
    colors: ["#f5f7f8", "#e8edf0", "#c81e2b"]
  },
  {
    id: "command",
    name: "Command Deck",
    description: "Focused zinc control surfaces, compact status layers and crisp operational contrast.",
    colors: ["#f4f4f5", "#18181b", "#e11d48"]
  },
  {
    id: "atlas",
    name: "Atlas Control",
    description: "Structured cobalt navigation, editorial data hierarchy and calm enterprise surfaces.",
    colors: ["#f2f6fa", "#102a43", "#1f6aa5"]
  },
  {
    id: "matrix",
    name: "Forge Matrix",
    description: "Dimensional graphite panels, technical grid depth and HTC red command signals.",
    colors: ["#eef1f2", "#0d1418", "#d62b20"]
  }
] as const;

export const ADMIN_UI_LAYOUTS = [
  {
    id: "operations",
    name: "Operations Sidebar",
    description: "The current balanced 264px navigation and flexible work canvas.",
    signature: "Balanced"
  },
  {
    id: "compact",
    name: "Compact Console",
    description: "A 220px sidebar and denser canvas for repeated daily operations.",
    signature: "Dense"
  },
  {
    id: "rail",
    name: "Command Rail",
    description: "Icon-first 88px navigation that maximizes tables, charts and order work.",
    signature: "Wide canvas"
  },
  {
    id: "studio",
    name: "Studio Canvas",
    description: "A 304px information rail with a calmer centered workspace for content management.",
    signature: "Spacious"
  }
] as const;

export type StorefrontThemeId = (typeof STOREFRONT_THEMES)[number]["id"];
export type StorefrontLayoutId = (typeof STOREFRONT_LAYOUTS)[number]["id"];
export type StorefrontInterfaceId = (typeof STOREFRONT_INTERFACES)[number]["id"];
export type AdminUiThemeId = (typeof ADMIN_UI_THEMES)[number]["id"];
export type AdminUiLayoutId = (typeof ADMIN_UI_LAYOUTS)[number]["id"];

export function normalizeStorefrontTheme(value?: string | null): StorefrontThemeId {
  return STOREFRONT_THEMES.some((theme) => theme.id === value) ? value as StorefrontThemeId : "industrial";
}

export function normalizeStorefrontLayout(value?: string | null): StorefrontLayoutId {
  return STOREFRONT_LAYOUTS.some((layout) => layout.id === value) ? value as StorefrontLayoutId : "showroom";
}

export function normalizeAdminUiTheme(value?: string | null): AdminUiThemeId {
  return ADMIN_UI_THEMES.some((theme) => theme.id === value) ? value as AdminUiThemeId : "operations";
}

export function normalizeAdminUiLayout(value?: string | null): AdminUiLayoutId {
  return ADMIN_UI_LAYOUTS.some((layout) => layout.id === value) ? value as AdminUiLayoutId : "operations";
}
