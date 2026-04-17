/**
 * Omote (面) — Surfaces.
 *
 * Backgrounds, chrome, backdrops — the visual plane content sits on.
 *
 * Tier: 2 · Concern: surface
 */

import { garasu } from './garasu'
import { kage } from './kage'
import { kyousei } from './kyousei'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	panel: ['shadow-lg', kyousei.outline],
	content: 'lg:rounded-lg lg:shadow-xs',
	popover: garasu.md,
	skeleton: 'animate-pulse',
	glass: ['bg-transparent', garasu.md],
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	panel: 'bg-white',
	content: ['lg:bg-white'],
	backdrop: {
		md: 'bg-white/50',
		lg: 'bg-white/75',
	},
	popover: ['bg-white/90', 'ring-1 ring-zinc-950/10'],
	surface: 'bg-white',
	tint: 'bg-zinc-950/5',
	tintBefore: 'before:bg-zinc-950/5',
	skeleton: 'bg-zinc-200',
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	panel: 'dark:bg-zinc-900',
	content: ['dark:lg:bg-zinc-900'],
	backdrop: {
		md: 'dark:bg-zinc-950/50',
		lg: 'dark:bg-zinc-950/75',
	},
	popover: ['dark:bg-zinc-800/75', 'dark:ring-white/10 dark:ring-inset'],
	surface: 'dark:bg-zinc-900',
	tint: 'dark:bg-white/10',
	tintBefore: 'dark:before:bg-white/10',
	skeleton: 'dark:bg-zinc-700',
}

// ── Export ───────────────────────────────────────────────
export const omote = {
	panel: {
		base: [kage.ring, motoi.panel, hiru.panel, yoru.panel],
		chrome: [kage.ring, motoi.panel],
		bg: [hiru.panel, yoru.panel],
	},
	content: [motoi.content, hiru.content, yoru.content],
	backdrop: {
		base: [hiru.backdrop.md, yoru.backdrop.md, garasu.sm],
		glass: [hiru.backdrop.lg, yoru.backdrop.lg],
	},
	glass: motoi.glass,
	popover: [motoi.popover, hiru.popover, yoru.popover],
	surface: [hiru.surface, yoru.surface],
	tint: [hiru.tint, yoru.tint],
	tintBefore: [hiru.tintBefore, yoru.tintBefore],
	skeleton: [motoi.skeleton, hiru.skeleton, yoru.skeleton],
} as const
