/** Minimum a {@link Kanban} column must satisfy: a stable `id` and an `items` array; extend it with column metadata. */
export type KanbanColumnBase<T> = { id: string; items: T[] }
