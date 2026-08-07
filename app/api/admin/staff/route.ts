import { NextResponse } from "next/server";
import { Permission, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, sameOrigin } from "@/lib/security";

const staffRoles: Role[] = Object.values(Role).filter((role) => role !== Role.CUSTOMER);

async function primaryAdminOnly() {
  const admin = await requirePermission(Permission.STAFF_MANAGE);
  return admin?.role === Role.SUPER_ADMIN ? admin : null;
}

export async function GET() {
  const admin = await primaryAdminOnly();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    where: { role: { not: Role.CUSTOMER } },
    include: { permissions: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(users);
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const admin = await primaryAdminOnly();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const userId = String(body.userId || "");
  const role = body.role as Role;
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter((item: string) => Object.values(Permission).includes(item as Permission)) as Permission[] : [];
  const isActive = body.isActive !== false;
  if (!userId || !staffRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid staff payload" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === Role.CUSTOMER) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  if (target.role === Role.SUPER_ADMIN && (role !== Role.SUPER_ADMIN || !isActive)) {
    const otherPrimaryAdmins = await prisma.user.count({ where: { role: Role.SUPER_ADMIN, isActive: true, id: { not: target.id } } });
    if (otherPrimaryAdmins === 0) return NextResponse.json({ error: "At least one active Primary Admin is required" }, { status: 409 });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role, isActive } }),
    prisma.staffPermission.deleteMany({ where: { userId } }),
    prisma.staffPermission.createMany({ data: permissions.map((permission) => ({ userId, permission })), skipDuplicates: true }),
    prisma.activityLog.create({ data: { actorId: admin.id, action: "STAFF_PERMISSION_UPDATED", metadata: { userId, role, isActive, permissions }, ipAddress: getClientIp(request) } })
  ]);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const admin = await primaryAdminOnly();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = body.role as Role;
  if (name.length < 2 || !email.includes("@") || password.length < 8 || !staffRoles.includes(role)) {
    return NextResponse.json({ error: "Valid name, email, password, and staff role are required" }, { status: 400 });
  }
  try {
    const user = await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12), role, isActive: true } });
    await prisma.activityLog.create({ data: { actorId: admin.id, action: "STAFF_CREATED", entity: "User", entityId: user.id, newValue: { name, email, role }, ipAddress: getClientIp(request) } });
    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, permissions: [] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A user with this email may already exist" }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const admin = await primaryAdminOnly();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = new URL(request.url).searchParams.get("userId") || "";
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === Role.CUSTOMER) return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  if (target.role === Role.SUPER_ADMIN) {
    const otherPrimaryAdmins = await prisma.user.count({ where: { role: Role.SUPER_ADMIN, isActive: true, id: { not: target.id } } });
    if (otherPrimaryAdmins === 0) return NextResponse.json({ error: "The final active Primary Admin cannot be removed" }, { status: 409 });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { isActive: false } }),
    prisma.activityLog.create({ data: { actorId: admin.id, action: "STAFF_DEACTIVATED", entity: "User", entityId: target.id, ipAddress: getClientIp(request) } })
  ]);
  return NextResponse.json({ ok: true });
}
