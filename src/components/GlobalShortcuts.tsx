"use client";

import React, { useEffect, useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useOverlay } from "@/components/ui/OverlayContext";

// Lazy load heavy components
const KeyboardShortcuts = lazy(() => import("@/components/KeyboardShortcuts"));
const EcosystemPortal = lazy(() => import("@/components/common/EcosystemPortal").then(m => ({ default: m.EcosystemPortal })));



function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const editable = target.closest(
    'input, textarea, select, [contenteditable="true"], .ProseMirror'
  );
  return !!editable;
}

export default function GlobalShortcuts() {
  const router = useRouter();
  const { openOverlay } = useOverlay();
  const [openShortcuts, setOpenShortcuts] = useState(false);
  const [openEcosystem, setOpenEcosystem] = useState(false);



  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const hasMeta = e.metaKey || e.ctrlKey;
      
      const key = e.key.toLowerCase();

      // Cmd/Ctrl + Space => open ecosystem portal
      if (hasMeta && key === " ") {
        e.preventDefault();
        setOpenEcosystem(prev => !prev);
        return;
      }

      if (!hasMeta) return;

      // Cmd/Ctrl + / => open shortcuts
      if ((key === "/" || key === "?") && !e.altKey) {
        e.preventDefault();
        setOpenShortcuts(true);
        return;
      }

      // Avoid interfering with typing for other combos
      const typing = isTypingTarget(e.target);

      // Cmd/Ctrl + K => focus top bar search
      if (key === "k" && !e.altKey) {
        e.preventDefault();
        const input = document.getElementById("topbar-search-input") as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select?.();
        }
        return;
      }

      // Cmd/Ctrl + N => create new note (navigate to /notes if not there)
      if (key === "n" && !e.altKey && !typing) {
        e.preventDefault();
        if (window.location.pathname.startsWith("/notes")) {
          // Dynamically import CreateNoteForm when needed
          import("@/app/(app)/notes/CreateNoteForm").then(({ default: CreateNoteForm }) => {
            openOverlay(<CreateNoteForm onNoteCreated={() => {}} />);
          });
        } else {
          try {
            sessionStorage.setItem("open-create-note", "1");
          } catch {}
          router.push("/notes");
        }
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openOverlay, router]);

  return (
    <Suspense fallback={null}>
      {openShortcuts && <KeyboardShortcuts open={openShortcuts} onClose={() => setOpenShortcuts(false)} />}
      <EcosystemPortal open={openEcosystem} onClose={() => setOpenEcosystem(false)} />
    </Suspense>
  );
}
