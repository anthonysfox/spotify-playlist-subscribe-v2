"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useAssistantStore } from "store/useAssistantStore";

// The panel drags in @ai-sdk/react and the markdown renderer. Keep all of that
// out of every signed-in page's bundle until the assistant is actually opened.
const AssistantPanel = dynamic(
  () => import("./Chat/AssistantPanel").then((m) => m.AssistantPanel),
  { ssr: false },
);

/**
 * Always-mounted: just the floating "ask the fox" trigger. The heavy panel
 * loads on first open and stays mounted after that (so the conversation
 * persists across open/close).
 */
export function SearchAssistant() {
  const open = useAssistantStore((s) => s.open);
  const openWithMessage = useAssistantStore((s) => s.openWithMessage);
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    if (open) setEverOpened(true);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => openWithMessage()}
        aria-label="Ask the fox"
        className="fixed bottom-[76px] right-4 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ink shadow-[0_8px_24px_rgba(26,21,18,0.28)] transition-transform hover:scale-105 min-[900px]:bottom-6 min-[900px]:right-6"
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface">
          <Image
            src="/logo.png"
            alt=""
            width={38}
            height={38}
            className="h-[38px] w-[38px] object-cover"
          />
        </span>
      </button>

      {everOpened && <AssistantPanel />}
    </>
  );
}
