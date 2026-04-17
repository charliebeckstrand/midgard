import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'
import { waku } from '../waku'

export const datepicker = {
	control: {
		default: waku.control.surface,
		glass: [],
	},
	button: [
		...waku.inputBase,
		// ── Layout ──────────────────────────────────────
		'block',
		// ── Sizing ──────────────────────────────────────
		take.control.md,
		// ── Spacing ─────────────────────────────────────
		take.listbox.padding,
		// ── Typography ──────────────────────────────────
		'text-left',
		// ── Tokens ──────────────────────────────────────
		maru.rounded,
		// ── Appearance ──────────────────────────────────
		'appearance-none',
		// ── Cursor ──────────────────────────────────────
		'cursor-pointer',
	],
	value: 'block truncate',
	icon: [
		take.listbox.icon,
		// ── Layout ──────────────────────────────────────
		'flex items-center',
		// ── Spacing ─────────────────────────────────────
		'pr-3',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		// ── Pointer ─────────────────────────────────────
		'pointer-events-none',
	],
	clearButton: [
		// ── Spacing ─────────────────────────────────────
		'p-1 -m-1',
		// ── Tokens ──────────────────────────────────────
		'rounded-md',
		ki.inset,
		...sumi.textHover,
		// ── Pointer ─────────────────────────────────────
		'pointer-events-auto',
		// ── Cursor ──────────────────────────────────────
		'cursor-pointer',
	],
}
