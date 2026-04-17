import { kage } from '../kage'
import { maru } from '../maru'
import { sawari } from '../sawari'

export const sidebar = {
	base: [
		// ── Layout ──────────────────────────────────────
		'flex flex-col gap-y-4',
		// ── Sizing ──────────────────────────────────────
		'h-full',
		// ── Spacing ─────────────────────────────────────
		'px-4 py-6',
		// ── Effects ─────────────────────────────────────
		'overflow-y-auto overscroll-none',
	],
	item: [
		// ── Tokens ──────────────────────────────────────
		...sawari.navItem,
		maru.rounded,
		// ── Layout ──────────────────────────────────────
		'group relative',
		'flex w-full items-center gap-3',
		// ── Spacing ─────────────────────────────────────
		'px-2 py-2',
		// ── Typography ──────────────────────────────────
		'text-left text-sm/5 font-medium',
		// ── Cursor ──────────────────────────────────────
		sawari.cursor,
	],
	section: 'flex flex-col gap-0.5',
	label: ['truncate'],
	header: 'flex items-center gap-2',
	body: [
		// ── Layout ──────────────────────────────────────
		'flex flex-1 flex-col gap-4',
		// ── Effects ─────────────────────────────────────
		'overflow-y-auto',
	],
	divider: kage.divider,
	footer: [
		// ── Layout ──────────────────────────────────────
		'sticky bottom-0',
		'flex flex-col gap-0.5',
		// ── Spacing ─────────────────────────────────────
		'mt-auto',
	],
}
