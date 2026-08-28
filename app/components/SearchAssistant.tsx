"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChat } from "@ai-sdk/react";
import { Search, Sparkles, X, ArrowUp, Loader2 } from "lucide-react";
import { MessageBubble, TypingDots } from "./Chat/ChatMessage";

const SUGGESTIONS = [
  "What playlists am I managing?",
  "Find lo-fi playlists for studying",
  "Build me something for rainy mornings",
];

/**
 * A search bar plus an assistant chat that opens in an overlay modal.
 *
 * The chat is a portal'd, fixed overlay — it never touches document flow, so it
 * can't push the playlist grid around. The open/close animation only touches
 * opacity and transform (both GPU-composited) and keeps a constant border
 * radius, which is what keeps it smooth: no height reflow, no corner-radius
 * interpolation, no multi-step lag.
 *
 * Needs an `/api/chat` route (the useChat default endpoint). The UI works
 * without it; the replies won't.
 */
export function SearchAssistant({
  onSearch,
}: {
  onSearch?: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages, stop } = useChat();

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  // Portals need the DOM; only render the overlay client-side.
  useEffect(() => setMounted(true), []);

  // While open: Esc closes, background scroll is locked, and the input focuses.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 60);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
    };
  }, [open]);

  // Keep the latest message in view as it streams.
  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, busy, open]);

  // Reset on close: abort anything in flight, then clear the conversation after
  // the close animation. A fresh chat every open means a wedged/interrupted
  // conversation can never persist.
  useEffect(() => {
    if (open) return;
    stop();
    const t = setTimeout(() => {
      setMessages([]);
      setInput("");
    }, 250);
    return () => clearTimeout(t);
  }, [open, stop, setMessages]);

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) onSearch?.(q);
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
      {/* Static search bar — fixed shape, so there's nothing to glitch. */}
      <form
        onSubmit={runSearch}
        className="flex w-full max-w-2xl mx-auto items-center gap-2 rounded-full bg-white p-2 pl-4 shadow-md ring-1 ring-black/5 transition-shadow hover:shadow-lg"
      >
        <Search className="h-5 w-5 shrink-0 text-gray-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search playlists…"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#CC5500] to-[#A0522D] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-shadow hover:shadow-md"
        >
          <Sparkles className="h-4 w-4" />
          Ask AI
        </button>
      </form>

      {/* Chat overlay — portal'd to body so it escapes any overflow/transform
          parent and never affects layout. Kept mounted so the conversation
          persists across open/close; visibility toggles via opacity + pointer
          events only. */}
      {mounted &&
        createPortal(
          <div
            aria-hidden={!open}
            className={`fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] ${
              open ? "" : "pointer-events-none"
            }`}
          >
            {/* Backdrop — only opacity animates */}
            <div
              onClick={() => setOpen(false)}
              className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
                open ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Panel — only opacity + transform animate; radius is constant */}
            <div
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
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
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
