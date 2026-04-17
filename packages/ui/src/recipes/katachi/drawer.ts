import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const drawer = {
	panel: {
		base: [
			// ── Tokens ──────────────────────────────────────
			omote.panel.chrome,
			narabi.panel.base,
			// ── Layout ──────────────────────────────────────
			'fixed inset-x-0 bottom-0',
			'overflow-hidden',
			// ── Sizing ──────────────────────────────────────
			'w-full max-h-[85dvh]',
			// ── Border ──────────────────────────────────────
			'rounded-t-xl',
		],
		glass: {
			true: omote.glass,
			false: omote.panel.bg,
		},
	},
	title: [...narabi.panel.title, 'px-6 pt-6'],
	description: [...narabi.panel.description, 'px-6'],
	actions: [narabi.panel.actions, 'px-6 pb-6'],
	body: [
		narabi.panel.body,
		// ── Layout ──────────────────────────────────────
		'flex-1 overflow-y-auto overscroll-y-contain',
		// ── Spacing ─────────────────────────────────────
		'px-6 last:mb-6',
	],
	close: [
		// ── Layout ──────────────────────────────────────
		'absolute right-4 top-4',
		// ── Spacing ─────────────────────────────────────
		'p-1',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		ki.inset,
		maru.roundedMd,
	],
}
