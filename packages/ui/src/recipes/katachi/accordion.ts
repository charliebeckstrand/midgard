import { kage } from '../kage'
import { maru } from '../maru'
import { nagare } from '../nagare'
import { sumi } from '../sumi'

export const accordion = {
	base: 'flex flex-col',
	variant: {
		separated: ['gap-2'],
		bordered: [
			// ── Layout ──────────────────────────────────────
			'overflow-hidden',
			// ── Tokens ──────────────────────────────────────
			maru.rounded,
			kage.border,
			// ── Divider ─────────────────────────────────────
			'divide-y divide-zinc-950/10',
			'dark:divide-white/10',
		],
		plain: [
			// ── Divider ─────────────────────────────────────
			'divide-y divide-zinc-950/10',
			'dark:divide-white/10',
		],
	},
	item: {
		base: 'group/accordion-item',
		separated: [
			// ── Layout ──────────────────────────────────────
			'overflow-hidden',
			// ── Tokens ──────────────────────────────────────
			maru.rounded,
			kage.border,
		],
		bordered: '',
		plain: '',
	},
	button: [
		// ── Layout ──────────────────────────────────────
		'w-full flex items-center justify-between',
		// ── Spacing ─────────────────────────────────────
		'gap-3 px-4 py-3',
		// ── Typography ──────────────────────────────────
		'text-left text-sm/6 font-medium',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		sumi.textHover,
		// ── Data-[open] ─────────────────────────────────
		'group-data-[open]/accordion-item:text-zinc-950',
		'dark:group-data-[open]/accordion-item:text-white',
		'group-data-[open]/accordion-item:cursor-pointer',
		// ── Focus ───────────────────────────────────────
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
		// ── Disabled ────────────────────────────────────
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	indicator: [
		// ── Sizing ──────────────────────────────────────
		'shrink-0',
		// ── Tokens ──────────────────────────────────────
		nagare.transform,
		// ── Data-[open] ─────────────────────────────────
		'group-data-[open]/accordion-item:rotate-180',
	],
	panel: 'overflow-hidden',
	body: [
		// ── Spacing ─────────────────────────────────────
		'px-4 pb-3 pt-0',
		// ── Typography ──────────────────────────────────
		'text-sm/6',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
	],
	defaults: { variant: 'separated' as const },
}
