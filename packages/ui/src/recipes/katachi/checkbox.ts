import { ki } from '../ki'
import { kumi } from '../kumi'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { waku } from '../waku'

export const checkbox = {
	wrapper: [
		// ── Layout ──────────────────────────────────────
		kumi.center.inline,
		'relative',
		// ── Sizing ──────────────────────────────────────
		'size-4.5',
		// ── Tokens ──────────────────────────────────────
		ki.outline,
		// ── Cursor ──────────────────────────────────────
		'cursor-pointer',
		// ── Has-[checked] ───────────────────────────────
		'has-checked:*:data-[slot=checkbox-check]:opacity-100',
	],
	color: nuri.checkbox,
	base: [
		// ── Tokens ──────────────────────────────────────
		...waku.checkSurface,
		// ── Border ──────────────────────────────────────
		'rounded-[--spacing(1)]',
		// ── CSS vars ────────────────────────────────────
		'[--checkbox-checked-border:transparent]',
		// ── Has-[checked] ───────────────────────────────
		'has-checked:bg-(--checkbox-checked-bg) has-checked:border-(--checkbox-checked-border)',
		// ── Hover ───────────────────────────────────────
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	input: waku.check,
	disabled: sumi.textDisabled,
}
