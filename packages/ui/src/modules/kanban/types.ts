import type { ReactNode } from 'react'

/** Minimum a {@link Kanban} column must satisfy: a stable `id` and an `items` array; extend it with column metadata. */
export type KanbanColumnBase<T> = { id: string; items: T[] }

/** What the drag overlay copies from a card: its content and its `className`. */
export type KanbanOverlayEntry = { children: ReactNode; className: string | undefined }
