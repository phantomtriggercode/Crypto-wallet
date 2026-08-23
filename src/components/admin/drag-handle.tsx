import { GripVertical } from "lucide-react";

export function DragHandle() {
  return (
    <span className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-muted active:cursor-grabbing" aria-hidden="true">
      <GripVertical className="h-4 w-4" />
    </span>
  );
}
