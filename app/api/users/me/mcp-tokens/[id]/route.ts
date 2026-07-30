import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

/**
 * DELETE — revoke one of the caller's tokens. Soft revoke (`revokedAt`) rather
 * than a hard delete, so the token list can still show what was revoked if we
 * ever want to, and so `verifyToken` simply ignores it going forward.
 *
 * Scoped by userId so a caller can only revoke their own tokens.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await prisma.mcpAccessToken.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Token not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
