/**
 * Garasu (ガラス) — Glass.
 *
 * Translucent, frosted surfaces layered over content.
 *
 * Tier: 1 · Concern: glass
 */

export const garasu = {
	sm: 'backdrop-blur-sm',
	md: 'backdrop-blur',
	lg: 'backdrop-blur-lg',
	/** Hover/focus feedback for items inside a glass container. */
	item: [
		'group-data-[glass]/glass:not-disabled:not-data-disabled:hover:bg-zinc-950/10',
		'group-data-[glass]/glass:not-disabled:not-data-disabled:focus:bg-zinc-950/10',
		'dark:group-data-[glass]/glass:not-disabled:not-data-disabled:hover:bg-white/10',
		'dark:group-data-[glass]/glass:not-disabled:not-data-disabled:focus:bg-white/10',
	],
} as const
