import { narabi } from '../narabi'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const fieldset = {
	base: ['[&>legend+*]:pt-6', yasumi.disabled],
	legend: [
		// ── Typography ──────────────────────────────────
		'text-base/6 font-semibold',
		// ── Tokens ──────────────────────────────────────
		sumi.text,
		yasumi.disabled,
	],
	field: [
		...narabi.field,
		// ── Disabled ────────────────────────────────────
		'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
		'dark:data-disabled:border-white/15',
	],
	label: [
		// ── Typography ──────────────────────────────────
		'text-base/6 select-none',
		// ── Tokens ──────────────────────────────────────
		sumi.text,
		yasumi.disabled,
	],
	description: [
		// ── Typography ──────────────────────────────────
		'text-base/6',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		yasumi.disabled,
	],
	error: [
		// ── Typography ──────────────────────────────────
		'text-base/6',
		// ── Tokens ──────────────────────────────────────
		sumi.textError,
		yasumi.disabled,
	],
}
