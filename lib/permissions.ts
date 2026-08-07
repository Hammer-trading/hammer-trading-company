import type { Permission, Role } from "@prisma/client";

export const adminRoles: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "ORDER_MANAGER",
  "INVENTORY_MANAGER",
  "DELIVERY_STAFF",
  "SUPPORT_STAFF"
];

export const allPermissions: Permission[] = [
  "DASHBOARD_READ",
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PRODUCTS_READ",
  "PRODUCTS_WRITE",
  "CATEGORIES_WRITE",
  "BRANDS_WRITE",
  "INVENTORY_READ",
  "INVENTORY_WRITE",
  "DELIVERY_READ",
  "DELIVERY_WRITE",
  "CUSTOMERS_READ",
  "COUPONS_MANAGE",
  "BANNERS_MANAGE",
  "REVIEWS_MANAGE",
  "RETURNS_MANAGE",
  "SUPPORT_READ",
  "SUPPORT_WRITE",
  "REPORTS_READ",
  "STAFF_MANAGE",
  "ACTIVITY_READ",
  "SETTINGS_MANAGE",
  "PACKAGES_MANAGE",
  "SERVICES_MANAGE",
  "PROJECTS_MANAGE",
  "MEDIA_MANAGE",
  "CONTENT_MANAGE",
  "SEO_MANAGE",
  "SECURITY_MANAGE"
];

const rolePermissions: Record<Role, Permission[]> = {
  CUSTOMER: [],
  SUPER_ADMIN: allPermissions,
  ADMIN: allPermissions.filter((permission) => !["STAFF_MANAGE", "SETTINGS_MANAGE", "SECURITY_MANAGE"].includes(permission)),
  ORDER_MANAGER: ["DASHBOARD_READ", "ORDERS_READ", "ORDERS_WRITE", "CUSTOMERS_READ", "RETURNS_MANAGE"],
  INVENTORY_MANAGER: ["DASHBOARD_READ", "PRODUCTS_READ", "PRODUCTS_WRITE", "INVENTORY_READ", "INVENTORY_WRITE", "CATEGORIES_WRITE", "BRANDS_WRITE", "PACKAGES_MANAGE"],
  DELIVERY_STAFF: ["DASHBOARD_READ", "ORDERS_READ", "DELIVERY_READ", "DELIVERY_WRITE"],
  SUPPORT_STAFF: ["DASHBOARD_READ", "ORDERS_READ", "CUSTOMERS_READ", "SUPPORT_READ", "SUPPORT_WRITE", "REVIEWS_MANAGE", "SERVICES_MANAGE"]
};

export function roleLabel(role: Role) {
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function permissionsFor(role: Role, explicit: Permission[] = []) {
  return Array.from(new Set([...rolePermissions[role], ...explicit]));
}

export function canAccess(user: { role: Role; permissions?: Permission[] }, permission: Permission) {
  return permissionsFor(user.role, user.permissions || []).includes(permission);
}
