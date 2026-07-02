import { useEffect, type RefObject } from "react";

/**
 * Closes a popup/menu when the user clicks anywhere outside `ref`, or
 * presses Escape. Shared by every dropdown/menu in the app (node action
 * menu, info popovers, the "+" node picker, the toolbar's keyboard-shortcuts
 * panel) so the close behavior — and the mousedown-vs-click choice that
 * makes it fire before a subsequent click handler elsewhere — stays
 * consistent instead of being re-implemented per component.
 */
export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return;

    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOutside();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onOutside is expected to be stable enough per-render; re-running per keystroke would be wasteful and every call site already only depends on `active`/`ref`.
  }, [active, ref]);
}
