import { NextResponse } from "next/server";
import { getPublishedPackage, getPublishedProject, getPublishedService } from "@/lib/platform-content";

type Context = { params: Promise<{ resource: string; slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { resource, slug } = await context.params;
  const item = resource === "services"
    ? await getPublishedService(slug)
    : resource === "packages"
      ? await getPublishedPackage(slug)
      : resource === "projects"
        ? await getPublishedProject(slug)
        : null;
  return item ? NextResponse.json({ item }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

