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
	backdrop: 'backdrop-blur-xs',
	popover: 'backdrop-blur-xl shadow-lg',
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	panel: 'bg-white',
	content: 'lg:bg-white lg:ring-1 lg:ring-zinc-950/5',
	backdrop: 'bg-zinc-950/25',
	popover: 'bg-white/75 ring-1 ring-zinc-950/10',
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	panel: 'dark:bg-zinc-900',
	content: 'dark:lg:bg-zinc-900 dark:lg:ring-white/10',
	backdrop: 'dark:bg-zinc-950/50',
	popover: ['dark:bg-zinc-800/75', 'dark:ring-white/10 dark:ring-inset'],
}

// ── Export ───────────────────────────────────────────────
export const omote = {
	panel: [kage.ring, motoi.panel, hiru.panel, yoru.panel],
	content: [motoi.content, hiru.content, yoru.content],
	backdrop: [motoi.backdrop, hiru.backdrop, yoru.backdrop],
	popover: [motoi.popover, hiru.popover, yoru.popover],
} as const
