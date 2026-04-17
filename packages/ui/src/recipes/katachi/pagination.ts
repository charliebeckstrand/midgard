import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const pagination = {
	base: ['flex list-none gap-1'],
	list: 'flex list-none items-center gap-1 m-0 p-0',
	page: {
		base: [
			// ── Layout ──────────────────────────────────────
			kumi.center.inline,
			'relative',
			// ── Sizing ──────────────────────────────────────
			'min-w-9',
			// ── Spacing ─────────────────────────────────────
			'px-2 py-1.5',
			// ── Typography ──────────────────────────────────
			'text-sm/6 font-medium',
			// ── Tokens ──────────────────────────────────────
			ki.ring,
			maru.rounded,
			sawari.cursor,
		],
		current: {
			true: [sumi.text],
			false: [sumi.textMuted, sumi.textHover],
		},
		defaults: { current: false as const },
	},
	gap: [
		// ── Layout ──────────────────────────────────────
		kumi.center.inline,
		// ── Sizing ──────────────────────────────────────
		'min-w-9',
		// ── Typography ──────────────────────────────────
		'text-sm/6',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		// ── Effects ─────────────────────────────────────
		'select-none',
	],
	nav: [
		// ── Layout ──────────────────────────────────────
		kumi.center.inline,
		// ── Spacing ─────────────────────────────────────
		'gap-1 px-2 py-1.5',
		// ── Typography ──────────────────────────────────
		'text-sm/6 font-medium',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		sumi.textHover,
		ki.ring,
		yasumi.disabled,
		maru.rounded,
		sawari.cursor,
	],
}
