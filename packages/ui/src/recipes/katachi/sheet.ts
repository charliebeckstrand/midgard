import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const sheet = {
	panel: {
		base: [
			// ── Tokens ──────────────────────────────────────
			omote.panel.chrome,
			narabi.panel.base,
			// ── Layout ──────────────────────────────────────
			'fixed overflow-y-auto',
			// ── Border ──────────────────────────────────────
			'rounded-xl',
		],
		glass: {
			true: omote.glass,
			false: omote.panel.bg,
		},
		side: {
			right: [
				// ── Layout ──────────────────────────────────────
				'inset-y-0 right-0 w-full',
				// ── Border ──────────────────────────────────────
				'max-sm:rounded-r-none',
				// ── Responsive ──────────────────────────────────
				'sm:top-4 sm:right-4 sm:bottom-4',
			],
			left: [
				// ── Layout ──────────────────────────────────────
				'inset-y-0 left-0 w-full',
				// ── Border ──────────────────────────────────────
				'max-sm:rounded-l-none',
				// ── Responsive ──────────────────────────────────
				'sm:top-4 sm:left-4 sm:bottom-4',
			],
			top: narabi.slide.top,
			bottom: narabi.slide.bottom,
		},
		size: take.panel,
		defaults: { side: 'right' as const, size: 'md' as const },
	},
	title: [...narabi.panel.title, 'px-6 pt-6'],
	description: [...narabi.panel.description, 'px-6'],
	actions: [narabi.panel.actions, 'px-6 pb-6'],
	body: [narabi.panel.body, 'flex-1 overflow-y-auto px-6'],
	close: [
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		ki.inset,
		maru.roundedMd,
		// ── Layout ──────────────────────────────────────
		'absolute right-5 top-5',
		// ── Spacing ─────────────────────────────────────
		'p-1',
	],
}
