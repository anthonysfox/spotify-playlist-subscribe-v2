import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/mcp-tokens";

/**
 * GET — list the caller's MCP tokens. Metadata only: the plaintext token is
 * never returned again after creation (we don't even have it — only the hash).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await prisma.mcpAccessToken.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return NextResponse.json({ tokens });
}

/**
 * POST — create a new token and return the plaintext exactly once. We store only
 * its hash, so this response is the single opportunity to copy it.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let name: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.name === "string" && body.name.trim()) {
      name = body.name.trim().slice(0, 120);
    }
  } catch {
    // Body is optional; a nameless token is fine.
  }

  const { token, tokenHash, prefix } = generateToken();

  const record = await prisma.mcpAccessToken.create({
    data: { userId, name, tokenHash, prefix },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  // `token` is included here and NOWHERE else, ever.
  return NextResponse.json({ ...record, token }, { status: 201 });
}
