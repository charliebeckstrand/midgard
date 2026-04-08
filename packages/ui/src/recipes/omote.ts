/**
 * Omote (面) — Surfaces.
 *
 * The face of a thing — backgrounds, chrome, backdrops. Everything that
 * establishes a visual plane for content to sit on.
 *
 * Tier: 2
 * Concern: surface
 */

import { kage } from './kage'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	panel: ['shadow-lg', 'forced-colors:outline'],
	content: 'lg:rounded-lg lg:shadow-xs',
	backdrop: 'backdrop-blur-sm',
	popover: 'backdrop-blur-sm shadow-lg',
	skeleton: 'animate-pulse',
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	panel: 'bg-white',
	content: 'lg:bg-white lg:ring-1 lg:ring-zinc-950/5',
	backdrop: 'bg-zinc-950/50',
	popover: 'bg-white/90 ring-1 ring-zinc-950/10',
	surface: 'bg-white',
	tint: 'bg-zinc-950/5',
	tintBefore: 'before:bg-zinc-950/5',
	skeleton: 'bg-zinc-200',
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	panel: 'dark:bg-zinc-900',
	content: 'dark:lg:bg-zinc-900 dark:lg:ring-white/10',
	backdrop: 'dark:bg-zinc-950/70',
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
		base: [motoi.backdrop, hiru.backdrop, yoru.backdrop],
		blur: motoi.backdrop,
		color: [hiru.backdrop, yoru.backdrop],
	},
	popover: [motoi.popover, hiru.popover, yoru.popover],
	surface: [hiru.surface, yoru.surface],
	tint: [hiru.tint, yoru.tint],
	tintBefore: [hiru.tintBefore, yoru.tintBefore],
	skeleton: [motoi.skeleton, hiru.skeleton, yoru.skeleton],
} as const
