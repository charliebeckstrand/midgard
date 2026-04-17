import { kage } from '../kage'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'

export const alert = {
	base: [
		// ── Layout ──────────────────────────────────────
		'flex w-fit',
		// ── Spacing ─────────────────────────────────────
		'gap-3 p-3',
		// ── Typography ──────────────────────────────────
		'text-sm/5',
		// ── Tokens ──────────────────────────────────────
		maru.rounded,
	],
	variant: {
		solid: {
			base: [
				// ── Border ──────────────────────────────────────
				'border border-transparent',
				// ── Tokens ──────────────────────────────────────
				kage.shadow,
			],
			color: nuri.solid,
		},
		soft: {
			base: ['border border-transparent'],
			color: nuri.soft,
		},
		outline: {
			base: ['border'],
			color: nuri.outline,
		},
		plain: {
			base: ['border border-transparent'],
			color: nuri.text,
		},
	},
	icon: 'shrink-0',
	content: 'flex flex-col flex-1 gap-1 min-w-0',
	title: 'text-base/6 font-semibold',
	description: 'leading-loose',
	actions: 'mt-2 flex items-center gap-1',
	close: [
		// ── Layout ──────────────────────────────────────
		'shrink-0',
		// ── Spacing ─────────────────────────────────────
		'-m-1 p-1',
		// ── Tokens ──────────────────────────────────────
		maru.roundedMd,
		sawari.cursor,
	],
	defaults: { variant: 'soft' as const, color: 'zinc' as const },
}
