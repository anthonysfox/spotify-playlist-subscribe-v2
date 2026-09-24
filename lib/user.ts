import prisma from "@/lib/prisma";

export async function ensureUser(clerkUserId: string) {
  const existing = await prisma.user.findUnique({ where: { clerkUserId } });
  if (existing) return existing;

  // imported lazily so this module still loads outside a Next server runtime
  const { clerkClient } = await import("@clerk/nextjs/server");
  const clerkUser = await (await clerkClient()).users.getUser(clerkUserId);

  return prisma.user.upsert({
    where: { clerkUserId },
    update: {},
    create: {
      clerkUserId,
      email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
      name:
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        "User",
      imageUrl: clerkUser.imageUrl,
    },
  });
}
