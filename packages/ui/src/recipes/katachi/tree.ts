import { ki } from '../ki'
import { maru } from '../maru'
import { nagare } from '../nagare'
import { sumi } from '../sumi'

export type TreeColor = 'sky' | 'lime' | 'rose' | 'amber' | 'violet'

export const treeColorMap: Record<TreeColor, string | string[]> = {
	sky: [
		// ── Color (light) ───────────────────────────────
		'text-sky-600 group-hover/tree-item:text-sky-700',
		// ── Color (dark) ────────────────────────────────
		'dark:text-sky-600 dark:group-hover/tree-item:text-sky-500',
	],
	lime: [
		// ── Color (light) ───────────────────────────────
		'text-lime-600 group-hover/tree-item:text-lime-700',
		// ── Color (dark) ────────────────────────────────
		'dark:text-lime-600 dark:group-hover/tree-item:text-lime-500',
	],
	rose: [
		// ── Color (light) ───────────────────────────────
		'text-rose-600 group-hover/tree-item:text-rose-700',
		// ── Color (dark) ────────────────────────────────
		'dark:text-rose-600 dark:group-hover/tree-item:text-rose-500',
	],
	amber: [
		// ── Color (light) ───────────────────────────────
		'text-amber-600 group-hover/tree-item:text-amber-700',
		// ── Color (dark) ────────────────────────────────
		'dark:text-amber-600 dark:group-hover/tree-item:text-amber-500',
	],
	violet: [
		// ── Color (light) ───────────────────────────────
		'text-violet-600 group-hover/tree-item:text-violet-700',
		// ── Color (dark) ────────────────────────────────
		'dark:text-violet-600 dark:group-hover/tree-item:text-violet-500',
	],
}

export const tree = {
	base: '',
	itemContent: [
		// ── Layout ──────────────────────────────────────
		'flex w-full items-center gap-1.5',
		// ── Spacing ─────────────────────────────────────
		'py-1 px-2',
		// ── Typography ──────────────────────────────────
		'text-sm/6',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		sumi.textHover,
		maru.rounded,
		ki.inset,
		// ── Data-[open] ─────────────────────────────────
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
		'data-[open]:cursor-pointer',
	],
	itemContentActive: sumi.text,
	chevron: ['flex-none', nagare.transform],
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
}
