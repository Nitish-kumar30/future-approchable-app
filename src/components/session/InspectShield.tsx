import type { ReactNode } from 'react';
import { blockInspectContextMenu, blockInspectMouseDown } from '@/lib/inspectProtection';

/** Blocks right-click on same-document video areas (not inside cross-origin iframes). */
export function InspectShield({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      onContextMenu={blockInspectContextMenu}
      onMouseDown={blockInspectMouseDown}
    >
      {children}
    </div>
  );
}
