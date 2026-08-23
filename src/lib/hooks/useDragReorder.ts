"use client";

import { useRef } from "react";

/**
 * Native HTML5 drag-and-drop reordering for a list. The drag handle (not the whole row)
 * should get `dragHandleProps` so dragging doesn't fight with text selection in row inputs;
 * the row container gets `dropTargetProps` so dropping anywhere on the row works.
 */
export function useDragReorder<T>(items: T[], onReorder: (next: T[]) => void) {
  const dragIndex = useRef<number | null>(null);

  function dragHandleProps(index: number) {
    return {
      draggable: true,
      onDragStart: () => {
        dragIndex.current = index;
      },
      onDragEnd: () => {
        dragIndex.current = null;
      },
    };
  }

  function dropTargetProps(index: number) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const from = dragIndex.current;
        dragIndex.current = null;
        if (from === null || from === index) return;
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(index, 0, moved);
        onReorder(next);
      },
    };
  }

  return { dragHandleProps, dropTargetProps };
}
