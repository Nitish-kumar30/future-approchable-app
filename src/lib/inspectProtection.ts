/** Block right-click / secondary-click inspect on same-document elements. */
export function blockInspectContextMenu(e: React.MouseEvent | MouseEvent): void {
  e.preventDefault();
}

/** Block right mouse button before context menu opens (same-document only). */
export function blockInspectMouseDown(e: React.MouseEvent | MouseEvent): void {
  if (e.button === 2) e.preventDefault();
}
