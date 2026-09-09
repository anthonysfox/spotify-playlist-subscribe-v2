import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { executeProposal, type AgentProposal } from "@/lib/agent/proposals";

/**
 * Runs a change the assistant proposed, after the user confirmed it in the UI.
 * The assistant's tools never mutate directly — they return an AgentProposal;
 * this is the only path that actually applies one.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { proposal?: AgentProposal };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const proposal = body.proposal;
  if (!proposal || typeof proposal.action !== "string") {
    return NextResponse.json({ error: "Missing proposal" }, { status: 400 });
  }

  try {
    const result = await executeProposal(userId, proposal);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error: any) {
    console.error("agent execute failed:", error);
    return NextResponse.json(
      { ok: false, message: error?.message ?? "Something went wrong" },
      { status: 500 },
    );
  }
}
