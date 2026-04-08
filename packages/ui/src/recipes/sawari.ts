/**
 * Sawari (触り) — Touch response.
 *
 * How an element reacts to hover, press, and selection — the tactile
 * feedback that tells you something is alive under your finger.
 *
 * Tier: 2
 * Concern: interaction
 */

import { ki } from './ki'
import { maru } from './maru'
import { sumi } from './sumi'
import { take } from './take'
import { yasumi } from './yasumi'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	item: [
		'cursor-default sm:py-1.5 py-2.5 outline-hidden',
		'text-base/6',
		'forced-color-adjust-none forced-colors:text-[CanvasText]',
		'forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
		yasumi.disabled,
	],
	nav: [take.iconSlot.md, '*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7'],
	hover: 'not-disabled:hover:after:bg-[color-mix(in_oklab,currentColor_15%,transparent)]',
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	item: 'hover:bg-zinc-950/5 focus:bg-zinc-950/5',
	nav: [
		'group-hover:bg-zinc-950/5 group-hover:*:data-[slot=icon]:fill-zinc-950',
		'data-current:group-hover:bg-transparent! data-current:active:bg-transparent!',
	],
	tab: ['data-current:text-zinc-950', 'not-data-current:not-disabled:hover:text-zinc-700'],
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	item: 'dark:hover:bg-white/5 dark:focus:bg-white/5',
	nav: [
		'dark:text-white',
		'dark:group-hover:bg-white/5 dark:group-hover:*:data-[slot=icon]:fill-zinc-400',
		'dark:data-current:group-hover:bg-transparent! dark:data-current:active:bg-transparent!',
	],
	tab: ['dark:data-current:text-white', 'dark:not-data-current:not-disabled:hover:text-zinc-200'],
}

// ── Composed (internal) ─────────────────────────────────
const item = [sumi.text, maru.rounded, motoi.item, hiru.item, yoru.item]
const nav = [motoi.nav, hiru.nav, yoru.nav]

// ── Export ───────────────────────────────────────────────
export const sawari = {
	item,
	nav,
	tab: [sumi.textMuted, hiru.tab, yoru.tab],
	navItem: [...nav, ki.offset],
	cursor: 'cursor-default',
	hover: motoi.hover,
	focusText: 'group-focus/option:text-white',
	focusTextMuted: 'group-focus/option:text-white/70',
}
