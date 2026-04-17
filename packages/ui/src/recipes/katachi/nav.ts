import { maru } from '../maru'
import { sawari } from '../sawari'

export const nav = {
	list: {
		base: 'flex',
		orientation: {
			vertical: 'flex-col gap-0.5',
			horizontal: 'flex-row gap-1',
		},
	},
	item: [
		// ── Layout ──────────────────────────────────────
		'group relative flex w-full items-center',
		// ── Spacing ─────────────────────────────────────
		'gap-1.5 p-2',
		// ── Typography ──────────────────────────────────
		'text-left text-sm/5 font-medium',
		// ── Tokens ──────────────────────────────────────
		...sawari.navItem,
		maru.rounded,
		sawari.cursor,
	],
}
