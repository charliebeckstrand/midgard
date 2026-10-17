import type { ReactNode } from 'react'

/** What the drag overlay copies from a card: its content and its `className`. */
export type KanbanOverlayEntry = { children: ReactNode; className: string | undefined }
