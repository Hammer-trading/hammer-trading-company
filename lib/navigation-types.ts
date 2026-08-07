export type PublicNavigationItem = {
  id: string;
  label: string;
  href: string;
  location: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  desktopVisible: boolean;
  mobileVisible: boolean;
  openInNewTab: boolean;
  children?: PublicNavigationItem[];
};

