"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-sm">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <img
                src="/logo.png"
                alt="PlaylistFox"
                className="h-10 w-10 rounded-lg"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900">
                Install PlaylistFox
              </h3>
              <p className="text-sm text-gray-600">
                Add to your home screen for quick access
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleInstall}
            className="flex flex-1 items-center justify-center space-x-1 rounded-lg bg-[#CC5500] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B04A00]"
          >
            <Download size={16} />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
