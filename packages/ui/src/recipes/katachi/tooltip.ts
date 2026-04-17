import { ma } from '../ma'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const tooltip = {
	trigger: 'inline-flex cursor-help *:cursor-help',
	content: [
		// ── Layout ──────────────────────────────────────
		'z-50',
		// ── Spacing ─────────────────────────────────────
		ma.density.px.md,
		ma.density.py.md,
		// ── Typography ──────────────────────────────────
		take.text.md,
		'font-medium',
		'whitespace-nowrap',
		// ── Tokens ──────────────────────────────────────
		omote.popover,
		maru.rounded,
		sumi.text,
		// ── Effects ─────────────────────────────────────
		'pointer-events-none',
	],
}
