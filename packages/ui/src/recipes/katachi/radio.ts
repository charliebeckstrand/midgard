import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { waku } from '../waku'

export const radio = {
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
		'has-checked:*:data-[slot=radio-indicator]:opacity-100',
	],
	color: nuri.radio,
	base: [
		// ── Tokens ──────────────────────────────────────
		...waku.checkSurface,
		maru.roundedFull,
		// ── CSS vars ────────────────────────────────────
		'[--radio-checked-border:transparent]',
		// ── Has-[checked] ───────────────────────────────
		'has-checked:bg-(--radio-checked-bg) has-checked:border-(--radio-checked-border)',
		// ── Hover ───────────────────────────────────────
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	input: waku.check,
	disabled: sumi.textDisabled,
}
