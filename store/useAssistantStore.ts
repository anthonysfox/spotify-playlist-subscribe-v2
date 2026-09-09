import { create } from "zustand";

interface AssistantStore {
  open: boolean;
  /** Set right before opening so the panel can seed the conversation with it,
   *  then cleared once consumed — lets the Discover search bar's "Ask AI"
   *  hand off whatever was typed instead of discarding it. */
  pendingMessage: string | null;
  openWithMessage: (message?: string) => void;
  close: () => void;
}

/**
 * Cross-tree control for the assistant panel.
 *
 * The panel itself is mounted once at the Dashboard level so it persists
 * across tab switches, but things that want to open it (the Discover search
 * bar, a header trigger) live elsewhere in the tree — a store is what lets
 * them talk to it without prop-drilling through components that otherwise
 * have nothing to do with each other.
 */
export const useAssistantStore = create<AssistantStore>((set) => ({
  open: false,
  pendingMessage: null,
  openWithMessage: (message) =>
    set({ open: true, pendingMessage: message?.trim() || null }),
  close: () => set({ open: false }),
}));
