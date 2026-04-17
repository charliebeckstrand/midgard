import { maru } from '../maru'

export const resizable = {
	group: 'flex h-full w-full overflow-hidden',
	panel: 'relative overflow-hidden',
	handle: [
		// ── Layout ──────────────────────────────────────
		'group/handle relative flex shrink-0 items-center justify-center',
		// ── Effects ─────────────────────────────────────
		'outline-none touch-none',
	],
	handleHorizontal: 'px-2 cursor-col-resize',
	handleVertical: 'py-2 cursor-row-resize',
	grip: [
		// ── Tokens ──────────────────────────────────────
		maru.roundedFull,
		// ── Color (light) ───────────────────────────────
		'bg-zinc-300 group-hover/handle:bg-zinc-400',
		// ── Color (dark) ────────────────────────────────
		'dark:bg-zinc-600 dark:group-hover/handle:bg-zinc-500',
		// ── Focus ───────────────────────────────────────
		'group-focus-visible/handle:bg-blue-500 dark:group-focus-visible/handle:bg-blue-500',
	],
	gripDragging: '',
	gripHorizontal: 'h-6 w-0.5',
	gripVertical: 'w-6 h-0.5',
}
