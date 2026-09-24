import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, playlistRef, readJson } from "./helpers/route";

/*
 * Mocks must be declared at the top level, before the route is imported —
 * vitest hoists `vi.mock` above the imports so the handler binds to these fakes
 * rather than the real Clerk and the real subscribe().
 *
 * `vi.hoisted` is what lets the mock functions themselves exist that early.
 */
const { mockAuth, mockSubscribe } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSubscribe: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));

vi.mock("@/lib/subscribe", () => ({
  subscribe: mockSubscribe,
  // The route does `error instanceof SubscribeError`, so the mock module has to
  // export a real class for that check to mean anything.
  SubscribeError: class SubscribeError extends Error {
    constructor(
      message: string,
      readonly status = 400,
    ) {
      super(message);
    }
  },
}));

import { POST } from "@/app/api/music/subscribe/route";

const SESSION_USER = "user_session";
const VICTIM = "user_victim";

describe("POST /api/music/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: SESSION_USER });
    mockSubscribe.mockResolvedValue({
      managedPlaylist: { name: "Friday Rotation" },
      subscriptionId: "sub-1",
    });
  });

  /*
   * The regression test for the bypass.
   *
   * The route used to be `subscribe({ userId, ...body })`. Because the spread
   * came second, a `userId` in the request body overwrote the authenticated one
   * and subscribe() would run against the victim's music-service tokens. This
   * asserts the identity that reaches the domain layer is the session's, no
   * matter what the caller sent.
   */
  it("ignores a userId in the request body and uses the session identity", async () => {
    const response = await POST(
      jsonRequest({
        userId: VICTIM,
        sourcePlaylist: playlistRef(),
        newPlaylistName: "pwned",
      }),
    );

    expect(response.status).toBe(201);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    const passed = mockSubscribe.mock.calls[0][0];
    expect(passed.userId).toBe(SESSION_USER);
    expect(passed.userId).not.toBe(VICTIM);
  });

  it("rejects an anonymous caller before reaching the domain layer", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { status } = await readJson(
      await POST(jsonRequest({ sourcePlaylist: playlistRef() })),
    );

    expect(status).toBe(401);
    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
