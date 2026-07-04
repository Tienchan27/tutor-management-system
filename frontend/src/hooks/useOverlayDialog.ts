import { RefObject, useEffect, useRef } from 'react';

// Stack of currently-open overlays. Only the top-most reacts to Escape, so a
// dialog nested inside another (e.g. a discard prompt over a modal) closes just
// the top layer on one Escape press instead of both.
const overlayStack: symbol[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibility plumbing shared by every overlay (Modal, SlideOver, ConfirmDialog):
 * autofocus on open, restore focus to the trigger on close, trap Tab within the
 * panel, and route Escape to only the top-most overlay.
 */
export function useOverlayDialog(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const idRef = useRef<symbol>(Symbol('overlay'));

  useEffect(() => {
    if (!open) {
      return;
    }
    const id = idRef.current;
    overlayStack.push(id);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const isTop = (): boolean => overlayStack[overlayStack.length - 1] === id;

    const focusable = (): HTMLElement[] =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
        : [];

    function handleKey(event: KeyboardEvent): void {
      if (!isTop()) {
        return;
      }
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key === 'Tab' && panel) {
        const items = focusable();
        if (items.length === 0) {
          event.preventDefault();
          panel.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === panel)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      const index = overlayStack.indexOf(id);
      if (index !== -1) {
        overlayStack.splice(index, 1);
      }
      previouslyFocused?.focus?.();
    };
  }, [open, panelRef]);
}
