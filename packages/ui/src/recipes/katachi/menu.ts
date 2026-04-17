import { kage } from '../kage'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'

export const menu = {
	content: ['min-w-48', take.popup],
	item: [
		// ── Layout ──────────────────────────────────────
		'group/option flex w-full items-center',
		// ── Spacing ─────────────────────────────────────
		'gap-3 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
		// ── Tokens ──────────────────────────────────────
		...sawari.item,
		...narabi.item,
	],
	section: 'first:pt-0 last:pb-0',
	heading: [
		// ── Spacing ─────────────────────────────────────
		'px-3.5 pb-1 pt-2 sm:px-3',
		// ── Typography ──────────────────────────────────
		'text-xs/5 font-medium',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
	],
	label: 'truncate',
	description: [sumi.textMuted, sumi.focusText, narabi.description],
	shortcut: 'ml-auto',
	separator: kage.divider,
}
