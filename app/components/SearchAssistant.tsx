"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { X, ArrowUp, Loader2, RotateCcw } from "lucide-react";
import { MessageBubble, TypingDots } from "./Chat/ChatMessage";
import { useAssistantStore } from "store/useAssistantStore";

const SUGGESTIONS = [
  "What playlists am I managing?",
  "Find lo-fi playlists for studying",
  "Build me something for rainy mornings",
];

/**
 * The "ask the fox" panel (README "Screens" > AI assistant), plus a persistent
 * trigger. A right-docked drawer — same slot language as the subscribe sheet.
 *
 * The chat is portal'd and fixed, so it never touches document flow. Kept
 * mounted across open/close so the conversation persists; visibility toggles
 * with opacity + transform only. `inert` while closed keeps its contents out
 * of tab order.
 *
 * Writes never auto-execute: the mutating tools return a proposal that renders
 * as a confirm card in the message stream (see Chat/ChatMessage).
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

  useEffect(() => setMounted(true), []);

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

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) return;
    stop();
  }, [open, stop]);

  useEffect(() => {
    if (status !== "error") return;
    setMessages([]);
    setInput("");
  }, [status, setMessages]);

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
      {/* Persistent trigger — 52px ink circle with the fox. */}
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

      {mounted &&
        createPortal(
          <div
            aria-hidden={!open}
            inert={!open}
            className={`fixed inset-0 z-[100] flex justify-end ${
              open ? "" : "pointer-events-none"
            }`}
          >
            <div
              onClick={close}
              className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${
                open ? "opacity-100" : "opacity-0"
              }`}
            />

            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Ask the fox"
              className={`relative flex h-full w-full max-w-[380px] flex-col bg-ground shadow-[-16px_0_50px_rgba(26,21,18,0.3)] transition-transform duration-200 ease-out ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)]">
                    <Image
                      src="/logo.png"
                      alt=""
                      width={38}
                      height={38}
                      className="h-[38px] w-[38px] object-cover"
                    />
                  </span>
                  <div>
                    <div className="font-display text-[14px] font-semibold text-ink">
                      Ask the fox
                    </div>
                    <div className="text-[11px] text-ink-35">
                      Sees your library · asks before changing it
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={newChat}
                      aria-label="New chat"
                      title="New chat"
                      className="rounded-full p-1.5 text-ink-35 transition-colors hover:bg-ground-alt hover:text-ink-70"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="rounded-full p-1.5 text-ink-35 transition-colors hover:bg-ground-alt hover:text-ink-70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <p className="max-w-xs text-[13px] text-ink-50">
                      Discover playlists, manage subscriptions, or curate by
                      vibe.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => ask(s)}
                          className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12px] text-ink-70 transition-colors hover:border-brand/40 hover:text-brand"
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
                className="flex items-center gap-2 border-t border-line bg-surface p-2 pl-4"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your playlists…"
                  className="min-w-0 flex-1 rounded-full bg-transparent py-2.5 text-[13px] text-ink placeholder:text-ink-50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || busy}
                  aria-label="Send"
                  className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-ink text-surface transition-opacity disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5" />
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
