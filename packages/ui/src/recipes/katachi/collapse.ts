import { ki } from '../ki'
import { sumi } from '../sumi'

export const collapse = {
	base: 'group/collapse',
	trigger: [
		// ── Layout ──────────────────────────────────────
		'inline-flex items-center',
		// ── Spacing ─────────────────────────────────────
		'gap-1',
		// ── Typography ──────────────────────────────────
		'text-sm font-medium',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		sumi.textHover,
		ki.ring,
		// ── Data-[open] ─────────────────────────────────
		'group-data-[open]/collapse:text-zinc-950',
		'dark:group-data-[open]/collapse:text-white',
		'group-data-[open]/collapse:cursor-pointer',
		// ── Disabled ────────────────────────────────────
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	panel: 'overflow-hidden',
}
