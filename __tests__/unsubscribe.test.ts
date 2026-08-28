import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    managedPlaylistSourceSubscription: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    sourcePlaylist: { delete: vi.fn() },
    managedPlaylist: { delete: vi.fn() },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };
  return { mockPrisma };
});

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { unsubscribe, UnsubscribeError } from "@/lib/unsubscribe";

describe("unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb(mockPrisma),
    );
  });

  it("throws a 404 UnsubscribeError when no matching subscription is owned by this user", async () => {
    mockPrisma.managedPlaylistSourceSubscription.findFirst.mockResolvedValue(
      null,
    );

    try {
      await unsubscribe({
        userId: "user-1",
        managedPlaylistId: "mp-1",
        sourcePlaylistId: "sp-1",
      });
      expect.unreachable("expected unsubscribe to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsubscribeError);
      expect((err as UnsubscribeError).status).toBe(404);
    }

    expect(
      mockPrisma.managedPlaylistSourceSubscription.delete,
    ).not.toHaveBeenCalled();
  });
});
