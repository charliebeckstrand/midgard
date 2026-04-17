import { waku } from '../waku'

export const select = {
	base: [
		// ── Tokens ──────────────────────────────────────
		...waku.input,
		// ── Layout ──────────────────────────────────────
		'appearance-none',
		// ── Spacing ─────────────────────────────────────
		'pr-[calc(--spacing(10))]',
		// ── Color (dark) ────────────────────────────────
		'dark:[color-scheme:dark]',
	],
}
