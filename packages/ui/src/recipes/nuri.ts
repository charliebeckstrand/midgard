/**
 * Nuri (塗り) — Painted fills.
 *
 * Deliberate application of color — the pigment chosen for a specific element.
 * Each child maps color names to CSS custom property values for CVA variants.
 *
 * Branch of: Sumi (root)
 * Concern: color
 */
export const nuri = {
	/** Checkbox — maps to --checkbox-check, --checkbox-checked-bg, --checkbox-checked-border */
	checkbox: {
		zinc: [
			'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-900)] [--checkbox-checked-border:var(--color-zinc-950)]/90',
			'dark:[--checkbox-checked-bg:var(--color-zinc-600)]',
		],
		white:
			'[--checkbox-check:var(--color-zinc-900)] [--checkbox-checked-bg:var(--color-white)] [--checkbox-checked-border:var(--color-zinc-950)]/15',
		dark: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-900)] [--checkbox-checked-border:var(--color-zinc-950)]/90',
		red: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-red-600)] [--checkbox-checked-border:var(--color-red-800)]/90',
		amber:
			'[--checkbox-check:var(--color-amber-100)] [--checkbox-checked-bg:var(--color-amber-700)] [--checkbox-checked-border:var(--color-amber-600)]/80',
		green:
			'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-green-600)] [--checkbox-checked-border:var(--color-green-800)]/90',
		blue: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-blue-600)] [--checkbox-checked-border:var(--color-blue-800)]/90',
	},

	/** Radio — maps to --radio-checked-bg, --radio-checked-border, --radio-checked-indicator */
	radio: {
		zinc: [
			'[--radio-checked-bg:var(--color-zinc-900)] [--radio-checked-border:var(--color-zinc-950)]/90 [--radio-checked-indicator:var(--color-white)]',
			'dark:[--radio-checked-bg:var(--color-zinc-600)]',
		],
		white:
			'[--radio-checked-bg:var(--color-white)] [--radio-checked-border:var(--color-zinc-950)]/15 [--radio-checked-indicator:var(--color-zinc-900)]',
		dark: '[--radio-checked-bg:var(--color-zinc-900)] [--radio-checked-border:var(--color-zinc-950)]/90 [--radio-checked-indicator:var(--color-white)]',
		red: '[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-red-600)] [--radio-checked-border:var(--color-red-800)]/90',
		amber:
			'[--radio-checked-bg:var(--color-amber-700)] [--radio-checked-border:var(--color-amber-600)]/80 [--radio-checked-indicator:var(--color-amber-100)]',
		green:
			'[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-green-600)] [--radio-checked-border:var(--color-green-800)]/90',
		blue: '[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-blue-600)] [--radio-checked-border:var(--color-blue-800)]/90',
	},

	/** Switch — maps to --switch-bg, --switch-bg-ring, --switch, --switch-ring, --switch-shadow */
	switch: {
		zinc: [
			'[--switch-bg-ring:var(--color-zinc-950)]/90 [--switch-bg:var(--color-zinc-900)]',
			'[--switch-ring:var(--color-zinc-950)]/90 [--switch-shadow:var(--color-black)]/10 [--switch:white]',
			'dark:[--switch-bg-ring:transparent] dark:[--switch-bg:var(--color-white)]/25',
			'dark:[--switch-ring:var(--color-zinc-700)]/90',
		],
		white: [
			'[--switch-bg-ring:var(--color-black)]/15 [--switch-bg:white]',
			'[--switch-shadow:var(--color-black)]/10 [--switch-ring:transparent] [--switch:var(--color-zinc-950)]',
			'dark:[--switch-bg-ring:transparent]',
		],
		dark: [
			'[--switch-bg-ring:var(--color-zinc-950)]/90 [--switch-bg:var(--color-zinc-900)]',
			'[--switch-ring:var(--color-zinc-950)]/90 [--switch-shadow:var(--color-black)]/10 [--switch:white]',
			'dark:[--switch-bg-ring:var(--color-white)]/15',
		],
		red: [
			'[--switch-bg-ring:var(--color-red-800)]/90 [--switch-bg:var(--color-red-600)]',
			'[--switch:white] [--switch-ring:var(--color-red-800)]/90 [--switch-shadow:var(--color-red-200)]/20',
			'dark:[--switch-bg-ring:transparent]',
		],
		amber: [
			'[--switch-bg-ring:var(--color-amber-600)]/80 [--switch-bg:var(--color-amber-700)]',
			'[--switch-ring:transparent] [--switch-shadow:transparent] [--switch:var(--color-amber-100)]',
			'dark:[--switch-bg-ring:transparent]',
		],
		green: [
			'[--switch-bg-ring:var(--color-green-800)]/90 [--switch-bg:var(--color-green-600)]',
			'[--switch:white] [--switch-ring:var(--color-green-800)]/90 [--switch-shadow:var(--color-green-200)]/20',
			'dark:[--switch-bg-ring:transparent]',
		],
		blue: [
			'[--switch-bg-ring:var(--color-blue-800)]/90 [--switch-bg:var(--color-blue-600)]',
			'[--switch:white] [--switch-ring:var(--color-blue-800)]/90 [--switch-shadow:var(--color-blue-200)]/20',
			'dark:[--switch-bg-ring:transparent]',
		],
	},

	/** Button (solid variant) — maps to --btn-bg, --btn-border, --btn-hover-overlay, --btn-icon */
	button: {
		zinc: [
			'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:var(--color-zinc-950)]/90 [--btn-hover-overlay:var(--color-white)]/10',
			'[--btn-icon:var(--color-zinc-400)] hover:[--btn-icon:var(--color-zinc-300)]',
			'dark:[--btn-bg:var(--color-zinc-600)]',
		],
		white: [
			'text-zinc-950 [--btn-bg:white] [--btn-border:var(--color-zinc-950)]/10 [--btn-hover-overlay:var(--color-zinc-950)]/2.5',
			'hover:[--btn-border:var(--color-zinc-950)]/15',
			'dark:[--btn-hover-overlay:var(--color-zinc-950)]/10',
		],
		dark: [
			'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:var(--color-zinc-950)]/90 [--btn-hover-overlay:var(--color-white)]/10',
			'[--btn-icon:var(--color-zinc-400)] hover:[--btn-icon:var(--color-zinc-300)]',
		],
		red: [
			'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-red-600)] [--btn-border:var(--color-red-800)]/90',
		],
		amber: [
			'text-amber-100 [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-amber-600)] [--btn-border:var(--color-amber-600)]/80',
		],
		green: [
			'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-green-600)] [--btn-border:var(--color-green-800)]/90',
		],
		blue: [
			'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-blue-600)] [--btn-border:var(--color-blue-800)]/90',
		],
	},

	/** Badge soft — translucent fill with tinted text */
	badgeSoft: {
		red: [
			'bg-red-600/15 text-red-700',
			'group-hover:bg-red-600/25',
			'dark:bg-red-500/15 dark:text-red-400',
			'dark:group-hover:bg-red-500/25',
		],
		amber: [
			'bg-amber-600/15 text-amber-700',
			'group-hover:bg-amber-600/25',
			'dark:bg-amber-500/15 dark:text-amber-400',
			'dark:group-hover:bg-amber-500/25',
		],
		green: [
			'bg-green-600/15 text-green-700',
			'group-hover:bg-green-600/25',
			'dark:bg-green-500/15 dark:text-green-400',
			'dark:group-hover:bg-green-500/25',
		],
		blue: [
			'bg-blue-600/15 text-blue-700',
			'group-hover:bg-blue-600/25',
			'dark:bg-blue-500/15 dark:text-blue-400',
			'dark:group-hover:bg-blue-500/25',
		],
		teal: [
			'bg-teal-600/15 text-teal-700',
			'group-hover:bg-teal-600/25',
			'dark:bg-teal-500/15 dark:text-teal-400',
			'dark:group-hover:bg-teal-500/25',
		],
		zinc: [
			'bg-zinc-600/10 text-zinc-700',
			'group-hover:bg-zinc-600/20',
			'dark:bg-white/10 dark:text-zinc-300',
			'dark:group-hover:bg-white/15',
		],
		white: [
			'bg-white text-zinc-950',
			'group-hover:bg-zinc-50',
			'dark:bg-white/10 dark:text-white',
			'dark:group-hover:bg-white/15',
		],
		dark: [
			'bg-zinc-950/10 text-zinc-700',
			'group-hover:bg-zinc-950/15',
			'dark:bg-white/10 dark:text-zinc-300',
			'dark:group-hover:bg-white/15',
		],
	},

	/** Badge solid — opaque fill with contrasting text */
	badgeSolid: {
		red: [
			'bg-red-600 text-white',
			'group-hover:bg-red-700',
			'dark:bg-red-500',
			'dark:group-hover:bg-red-600',
		],
		amber: ['bg-amber-600 text-amber-950', 'group-hover:bg-amber-700'],
		green: [
			'bg-green-600 text-white',
			'group-hover:bg-green-700',
			'dark:bg-green-500',
			'dark:group-hover:bg-green-600',
		],
		blue: [
			'bg-blue-600 text-white',
			'group-hover:bg-blue-700',
			'dark:bg-blue-500',
			'dark:group-hover:bg-blue-600',
		],
		teal: [
			'bg-teal-600 text-white',
			'group-hover:bg-teal-700',
			'dark:bg-teal-500',
			'dark:group-hover:bg-teal-600',
		],
		zinc: [
			'bg-zinc-700 text-white',
			'group-hover:bg-zinc-800',
			'dark:bg-zinc-600',
			'dark:group-hover:bg-zinc-500',
		],
		white: [
			'bg-white text-zinc-950',
			'group-hover:bg-zinc-100',
			'dark:bg-zinc-200 dark:text-zinc-950',
			'dark:group-hover:bg-zinc-300',
		],
		dark: [
			'bg-zinc-950 text-white',
			'group-hover:bg-zinc-800',
			'dark:bg-white dark:text-zinc-950',
			'dark:group-hover:bg-zinc-200',
		],
	},
} as const
