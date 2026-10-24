import { NextRequest, NextResponse } from "next/server";
import { getAdminBucket } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";


export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
    }

    const bucket = getAdminBucket();
    // The extension comes from the verified type, never from the file name, which could contain
    // path pieces ("x.png/../../other") and write somewhere unintended in the bucket.
    const EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
    };
    const ext = EXT[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Use a JPG, PNG, WebP, GIF or AVIF image" }, { status: 400 });
    }
    const path = `news/featured_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const blob = bucket.file(path);
    await blob.save(buffer, { contentType: file.type });

    let url: string;
    try {
      await blob.makePublic();
      url = `https://storage.googleapis.com/${bucket.name}/${path}`;
    } catch {
      // Buckets with "uniform bucket-level access" enabled reject per-object ACLs —
      // fall back to a long-lived signed URL instead.
      const [signedUrl] = await blob.getSignedUrl({
        action: "read",
        expires: "01-01-2100",
      });
      url = signedUrl;
    }

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("Image upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
