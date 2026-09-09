"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChat } from "@ai-sdk/react";
import { Sparkles, X, ArrowUp, Loader2, RotateCcw } from "lucide-react";
import { MessageBubble, TypingDots } from "./Chat/ChatMessage";
import { useAssistantStore } from "store/useAssistantStore";

const SUGGESTIONS = [
  "What playlists am I managing?",
  "Find lo-fi playlists for studying",
  "Build me something for rainy mornings",
];

/**
 * The AI assistant panel, plus a persistent trigger button.
 *
 * Mounted once at the Dashboard level so it survives tab switches — it used
 * to live inside the Discover-only search bar, which meant the assistant
 * (and its own suggested question "What playlists am I managing?") vanished
 * entirely on the Subscribed tab. Opening is driven by useAssistantStore so
 * other components (the Discover search bar's "Ask AI") can open it with a
 * seeded message without needing a direct reference to this component.
 *
 * The chat is a portal'd, fixed overlay — it never touches document flow, so
 * it can't push the page around. The open/close animation only touches
 * opacity and transform (both GPU-composited) and keeps a constant border
 * radius, which is what keeps it smooth: no height reflow, no corner-radius
 * interpolation, no multi-step lag.
 *
 * Needs an `/api/chat` route (the useChat default endpoint). The UI works
 * without it; the replies won't.
 */
export function SearchAssistant() {
  const open = useAssistantStore((s) => s.open);
  const pendingMessage = useAssistantStore((s) => s.pendingMessage);
  const openWithMessage = useAssistantStore((s) => s.openWithMessage);
  const close = useAssistantStore((s) => s.close);

  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages, stop } = useChat();

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  // Portals need the DOM; only render the overlay client-side.
  useEffect(() => setMounted(true), []);

  // While open: Esc closes, background scroll is locked, the input focuses,
  // and Tab is trapped inside the panel so keyboard/screen-reader users can't
  // walk straight into the page behind it.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 60);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
    };
  }, [open, close]);

  // Keep the latest message in view as it streams.
  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, busy, open]);

  // Abort anything in flight on close, but keep the conversation — closing
  // the panel to look at what the assistant just did (a new card in the
  // list) shouldn't mean losing the thread when it's reopened.
  useEffect(() => {
    if (open) return;
    stop();
  }, [open, stop]);

  // The one case that DOES need a hard reset: a genuinely wedged/errored
  // request, which a stale conversation would just resubmit into again.
  useEffect(() => {
    if (status !== "error") return;
    setMessages([]);
    setInput("");
  }, [status, setMessages]);

  // Seed the conversation with whatever was passed to openWithMessage (e.g.
  // the Discover search bar's "Ask AI"), then consume it so it can't refire.
  useEffect(() => {
    if (!open || !pendingMessage) return;
    sendMessage({ text: pendingMessage });
    useAssistantStore.setState({ pendingMessage: null });
  }, [open, pendingMessage, sendMessage]);

  const newChat = () => {
    stop();
    setMessages([]);
    setInput("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  };

  const ask = (text: string) => {
    sendMessage({ text });
    setInput("");
  };

  return (
    <>
      {/* Persistent trigger — visible on every tab, not just Discover. */}
      <button
        type="button"
        onClick={() => openWithMessage()}
        aria-label="Open PlaylistFox assistant"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#CC5500] to-[#A0522D] text-white shadow-lg transition-shadow hover:shadow-xl"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Chat overlay — portal'd to body so it escapes any overflow/transform
          parent and never affects layout. Kept mounted so the conversation
          persists across open/close; visibility toggles via opacity + pointer
          events only. `inert` while closed keeps its (still-focusable-by-
          default) contents out of tab order and hidden from screen readers,
          rather than relying on aria-hidden alone. */}
      {mounted &&
        createPortal(
          <div
            aria-hidden={!open}
            inert={!open}
            className={`fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] ${
              open ? "" : "pointer-events-none"
            }`}
          >
            {/* Backdrop — only opacity animates */}
            <div
              onClick={close}
              className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
                open ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Panel — only opacity + transform animate; radius is constant */}
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Ask PlaylistFox"
              style={{ transformOrigin: "top center" }}
              className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-[opacity,transform] duration-200 ease-out ${
                open
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-[0.98] translate-y-2"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#CC5500] to-[#A0522D] text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-gray-900">
                    Ask PlaylistFox
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={newChat}
                      aria-label="New chat"
                      title="New chat"
                      className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages — fixed-height scroll region, no layout animation */}
              <div
                ref={scrollRef}
                className="h-[min(52vh,460px)] overflow-y-auto overscroll-contain px-4 py-4"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <p className="max-w-xs text-sm text-gray-500">
                      Discover playlists, manage subscriptions, or curate by
                      vibe.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => ask(s)}
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-[#CC5500]/40 hover:bg-orange-50 hover:text-[#CC5500]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((m) => (
                      <MessageBubble key={m.id} message={m} />
                    ))}
                    {busy && <TypingDots />}
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={submit}
                className="flex items-center gap-2 border-t border-gray-100 p-2 pl-4"
              >
                <Sparkles className="h-5 w-5 shrink-0 text-[#CC5500]" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your playlists…"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || busy}
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#CC5500] to-[#A0522D] text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
