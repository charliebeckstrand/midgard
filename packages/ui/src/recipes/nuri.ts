/**
 * Nuri (塗り) — Painted fills.
 *
 * Deliberate application of color — the pigment chosen for a specific element.
 * Each child maps color names to CSS custom property values for CVA variants.
 *
 * Tier: 1
 * Concern: color
 */

// ── Hiru (昼) ───────────────────────────────────────────

const hiru = {
	checkbox: {
		zinc: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-900)] [--checkbox-checked-border:var(--color-zinc-950)]/90',
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

	radio: {
		zinc: '[--radio-checked-bg:var(--color-zinc-900)] [--radio-checked-border:var(--color-zinc-950)]/90 [--radio-checked-indicator:var(--color-white)]',
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

	switch: {
		zinc: [
			'[--switch-bg-ring:var(--color-zinc-950)]/90 [--switch-bg:var(--color-zinc-900)]',
			'[--switch-ring:var(--color-zinc-950)]/90 [--switch-shadow:var(--color-black)]/10 [--switch:white]',
		],
		white: [
			'[--switch-bg-ring:var(--color-black)]/15 [--switch-bg:white]',
			'[--switch-shadow:var(--color-black)]/10 [--switch-ring:transparent] [--switch:var(--color-zinc-950)]',
		],
		dark: [
			'[--switch-bg-ring:var(--color-zinc-950)]/90 [--switch-bg:var(--color-zinc-900)]',
			'[--switch-ring:var(--color-zinc-950)]/90 [--switch-shadow:var(--color-black)]/10 [--switch:white]',
		],
		red: [
			'[--switch-bg-ring:var(--color-red-800)]/90 [--switch-bg:var(--color-red-600)]',
			'[--switch:white] [--switch-ring:var(--color-red-800)]/90 [--switch-shadow:var(--color-red-200)]/20',
		],
		amber: [
			'[--switch-bg-ring:var(--color-amber-600)]/80 [--switch-bg:var(--color-amber-700)]',
			'[--switch-ring:transparent] [--switch-shadow:transparent] [--switch:var(--color-amber-100)]',
		],
		green: [
			'[--switch-bg-ring:var(--color-green-800)]/90 [--switch-bg:var(--color-green-600)]',
			'[--switch:white] [--switch-ring:var(--color-green-800)]/90 [--switch-shadow:var(--color-green-200)]/20',
		],
		blue: [
			'[--switch-bg-ring:var(--color-blue-800)]/90 [--switch-bg:var(--color-blue-600)]',
			'[--switch:white] [--switch-ring:var(--color-blue-800)]/90 [--switch-shadow:var(--color-blue-200)]/20',
		],
	},

	button: {
		zinc: 'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:var(--color-zinc-950)]/90',
		white: [
			'text-zinc-950 [--btn-bg:white] [--btn-border:var(--color-zinc-950)]/10',
			'hover:[--btn-border:var(--color-zinc-950)]/15',
		],
		dark: [
			'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:var(--color-zinc-950)]/90',
			'[--btn-icon:var(--color-zinc-400)] hover:[--btn-icon:var(--color-zinc-300)]',
		],
		red: 'text-white [--btn-bg:var(--color-red-600)] [--btn-border:var(--color-red-800)]/90',
		amber:
			'text-amber-100 [--btn-bg:var(--color-amber-600)] [--btn-border:var(--color-amber-600)]/80',
		green: 'text-white [--btn-bg:var(--color-green-600)] [--btn-border:var(--color-green-800)]/90',
		blue: 'text-white [--btn-bg:var(--color-blue-600)] [--btn-border:var(--color-blue-800)]/90',
	},

	badgeSoft: {
		red: ['bg-red-600/15 text-red-700', 'group-hover:bg-red-600/25'],
		amber: ['bg-amber-600/15 text-amber-700', 'group-hover:bg-amber-600/25'],
		green: ['bg-green-600/15 text-green-700', 'group-hover:bg-green-600/25'],
		blue: ['bg-blue-600/15 text-blue-700', 'group-hover:bg-blue-600/25'],
		teal: ['bg-teal-600/15 text-teal-700', 'group-hover:bg-teal-600/25'],
		zinc: ['bg-zinc-600/10 text-zinc-700', 'group-hover:bg-zinc-600/20'],
		white: ['bg-white text-zinc-950', 'group-hover:bg-zinc-50'],
		dark: ['bg-zinc-950/10 text-zinc-700', 'group-hover:bg-zinc-950/15'],
	},

	badgeSolid: {
		red: ['bg-red-600 text-white', 'group-hover:bg-red-700'],
		amber: ['bg-amber-600 text-amber-950', 'group-hover:bg-amber-700'],
		green: ['bg-green-600 text-white', 'group-hover:bg-green-700'],
		blue: ['bg-blue-600 text-white', 'group-hover:bg-blue-700'],
		teal: ['bg-teal-600 text-white', 'group-hover:bg-teal-700'],
		zinc: ['bg-zinc-700 text-white', 'group-hover:bg-zinc-800'],
		white: ['bg-white text-zinc-950', 'group-hover:bg-zinc-100'],
		dark: ['bg-zinc-950 text-white', 'group-hover:bg-zinc-800'],
	},

	buttonSoft: {
		zinc: 'bg-zinc-600/10 text-zinc-700 not-disabled:hover:bg-zinc-600/20',
		white: 'bg-white text-zinc-950 not-disabled:hover:bg-zinc-50',
		dark: 'bg-zinc-950/10 text-zinc-700 not-disabled:hover:bg-zinc-950/15',
		red: 'bg-red-600/15 text-red-700 not-disabled:hover:bg-red-600/25',
		amber: 'bg-amber-600/15 text-amber-700 not-disabled:hover:bg-amber-600/25',
		green: 'bg-green-600/15 text-green-700 not-disabled:hover:bg-green-600/25',
		blue: 'bg-blue-600/15 text-blue-700 not-disabled:hover:bg-blue-600/25',
	},

	chipBorder: {
		zinc: 'border-zinc-300 text-zinc-700',
		red: 'border-red-300 text-red-700',
		amber: 'border-amber-300 text-amber-700',
		green: 'border-green-300 text-green-700',
		blue: 'border-blue-300 text-blue-700',
	},

	avatar: 'bg-zinc-600',

	buttonSolid: '[--btn-hover:color-mix(in_oklab,black_10%,transparent)]',

	switchTrack: 'bg-zinc-200 ring-1 ring-zinc-950/5 ring-inset',

	switchThumb: 'bg-white ring-1 ring-zinc-950/5',

	switchHover: 'not-disabled:not-checked:hover:bg-zinc-300',

	sidebarLabel: 'group-data-[current]:text-zinc-950',

	tableStriped: '*:odd:bg-zinc-950/2.5',

	tabIndicator: 'bg-zinc-950',
}

// ── Yoru (夜) ───────────────────────────────────────────

const yoru = {
	checkbox: {
		zinc: 'dark:[--checkbox-checked-bg:var(--color-zinc-600)]',
	},

	radio: {
		zinc: 'dark:[--radio-checked-bg:var(--color-zinc-600)]',
	},

	switch: {
		zinc: [
			'dark:[--switch-bg-ring:transparent] dark:[--switch-bg:var(--color-white)]/25',
			'dark:[--switch-ring:var(--color-zinc-700)]/90',
		],
		white: 'dark:[--switch-bg-ring:transparent]',
		dark: 'dark:[--switch-bg-ring:var(--color-white)]/15',
		red: 'dark:[--switch-bg-ring:transparent]',
		amber: 'dark:[--switch-bg-ring:transparent]',
		green: 'dark:[--switch-bg-ring:transparent]',
		blue: 'dark:[--switch-bg-ring:transparent]',
	},

	button: {
		zinc: 'dark:[--btn-bg:var(--color-zinc-600)]',
		white: 'dark:[--btn-bg:var(--color-zinc-600)]',
		red: 'dark:[--btn-hover:color-mix(in_oklab,white_20%,transparent)]',
	},

	badgeSoft: {
		red: ['dark:bg-red-500/15 dark:text-red-400', 'dark:group-hover:bg-red-500/25'],
		amber: ['dark:bg-amber-500/15 dark:text-amber-400', 'dark:group-hover:bg-amber-500/25'],
		green: ['dark:bg-green-500/15 dark:text-green-400', 'dark:group-hover:bg-green-500/25'],
		blue: ['dark:bg-blue-500/15 dark:text-blue-400', 'dark:group-hover:bg-blue-500/25'],
		teal: ['dark:bg-teal-500/15 dark:text-teal-400', 'dark:group-hover:bg-teal-500/25'],
		zinc: ['dark:bg-white/10 dark:text-zinc-300', 'dark:group-hover:bg-white/15'],
		white: ['dark:bg-white/10 dark:text-white', 'dark:group-hover:bg-white/15'],
		dark: ['dark:bg-white/10 dark:text-zinc-300', 'dark:group-hover:bg-white/15'],
	},

	badgeSolid: {
		red: ['dark:bg-red-500', 'dark:group-hover:bg-red-600'],
		green: ['dark:bg-green-500', 'dark:group-hover:bg-green-600'],
		blue: ['dark:bg-blue-500', 'dark:group-hover:bg-blue-600'],
		teal: ['dark:bg-teal-500', 'dark:group-hover:bg-teal-600'],
		zinc: ['dark:bg-zinc-600', 'dark:group-hover:bg-zinc-500'],
		white: ['dark:bg-zinc-200 dark:text-zinc-950', 'dark:group-hover:bg-zinc-300'],
		dark: ['dark:bg-white dark:text-zinc-950', 'dark:group-hover:bg-zinc-200'],
	},

	buttonSoft: {
		zinc: 'dark:bg-white/10 dark:text-zinc-300 dark:not-disabled:hover:bg-white/15',
		white: 'dark:bg-white/10 dark:text-white dark:not-disabled:hover:bg-white/15',
		dark: 'dark:bg-white/10 dark:text-zinc-300 dark:not-disabled:hover:bg-white/15',
		red: 'dark:bg-red-500/15 dark:text-red-400 dark:not-disabled:hover:bg-red-500/25',
		amber: 'dark:bg-amber-500/15 dark:text-amber-400 dark:not-disabled:hover:bg-amber-500/25',
		green: 'dark:bg-green-500/15 dark:text-green-400 dark:not-disabled:hover:bg-green-500/25',
		blue: 'dark:bg-blue-500/15 dark:text-blue-400 dark:not-disabled:hover:bg-blue-500/25',
	},
	chipBorder: {
		zinc: 'dark:border-zinc-600 dark:text-zinc-300',
		red: 'dark:border-red-700 dark:text-red-400',
		amber: 'dark:border-amber-700 dark:text-amber-400',
		green: 'dark:border-green-700 dark:text-green-400',
		blue: 'dark:border-blue-700 dark:text-blue-400',
	},

	avatar: 'dark:bg-zinc-700',
	buttonSolid: [
		'dark:[--btn-hover:color-mix(in_oklab,white_10%,transparent)]',
		'dark:border-white/5',
	],
	switchTrack: 'dark:bg-white/10 dark:ring-white/15',
	switchHover: 'dark:not-disabled:not-checked:hover:bg-white/15',
	sidebarLabel: 'dark:group-data-[current]:text-white',
	tableStriped: 'dark:*:odd:bg-white/2.5',
	tabIndicator: 'dark:bg-white',
}

// ── Export ───────────────────────────────────────────────

export const nuri = {
	checkbox: {
		zinc: [hiru.checkbox.zinc, yoru.checkbox.zinc],
		white: hiru.checkbox.white,
		dark: hiru.checkbox.dark,
		red: hiru.checkbox.red,
		amber: hiru.checkbox.amber,
		green: hiru.checkbox.green,
		blue: hiru.checkbox.blue,
	},

	radio: {
		zinc: [hiru.radio.zinc, yoru.radio.zinc],
		white: hiru.radio.white,
		dark: hiru.radio.dark,
		red: hiru.radio.red,
		amber: hiru.radio.amber,
		green: hiru.radio.green,
		blue: hiru.radio.blue,
	},

	switch: {
		zinc: [...hiru.switch.zinc, ...yoru.switch.zinc],
		white: [...hiru.switch.white, yoru.switch.white],
		dark: [...hiru.switch.dark, yoru.switch.dark],
		red: [...hiru.switch.red, yoru.switch.red],
		amber: [...hiru.switch.amber, yoru.switch.amber],
		green: [...hiru.switch.green, yoru.switch.green],
		blue: [...hiru.switch.blue, yoru.switch.blue],
	},

	button: {
		zinc: [hiru.button.zinc, yoru.button.zinc],
		white: [hiru.button.white, yoru.button.white],
		dark: hiru.button.dark,
		red: [hiru.button.red, yoru.button.red],
		amber: hiru.button.amber,
		green: hiru.button.green,
		blue: hiru.button.blue,
	},

	badgeSoft: {
		red: [...hiru.badgeSoft.red, ...yoru.badgeSoft.red],
		amber: [...hiru.badgeSoft.amber, ...yoru.badgeSoft.amber],
		green: [...hiru.badgeSoft.green, ...yoru.badgeSoft.green],
		blue: [...hiru.badgeSoft.blue, ...yoru.badgeSoft.blue],
		teal: [...hiru.badgeSoft.teal, ...yoru.badgeSoft.teal],
		zinc: [...hiru.badgeSoft.zinc, ...yoru.badgeSoft.zinc],
		white: [...hiru.badgeSoft.white, ...yoru.badgeSoft.white],
		dark: [...hiru.badgeSoft.dark, ...yoru.badgeSoft.dark],
	},

	badgeSolid: {
		red: [...hiru.badgeSolid.red, ...yoru.badgeSolid.red],
		amber: hiru.badgeSolid.amber,
		green: [...hiru.badgeSolid.green, ...yoru.badgeSolid.green],
		blue: [...hiru.badgeSolid.blue, ...yoru.badgeSolid.blue],
		teal: [...hiru.badgeSolid.teal, ...yoru.badgeSolid.teal],
		zinc: [...hiru.badgeSolid.zinc, ...yoru.badgeSolid.zinc],
		white: [...hiru.badgeSolid.white, ...yoru.badgeSolid.white],
		dark: [...hiru.badgeSolid.dark, ...yoru.badgeSolid.dark],
	},

	// ── Component-specific color tokens ──────────────────

	chipBorder: {
		zinc: [hiru.chipBorder.zinc, yoru.chipBorder.zinc],
		red: [hiru.chipBorder.red, yoru.chipBorder.red],
		amber: [hiru.chipBorder.amber, yoru.chipBorder.amber],
		green: [hiru.chipBorder.green, yoru.chipBorder.green],
		blue: [hiru.chipBorder.blue, yoru.chipBorder.blue],
	},
	buttonSoft: {
		zinc: [hiru.buttonSoft.zinc, yoru.buttonSoft.zinc],
		white: [hiru.buttonSoft.white, yoru.buttonSoft.white],
		dark: [hiru.buttonSoft.dark, yoru.buttonSoft.dark],
		red: [hiru.buttonSoft.red, yoru.buttonSoft.red],
		amber: [hiru.buttonSoft.amber, yoru.buttonSoft.amber],
		green: [hiru.buttonSoft.green, yoru.buttonSoft.green],
		blue: [hiru.buttonSoft.blue, yoru.buttonSoft.blue],
	},
	avatar: [hiru.avatar, yoru.avatar],
	buttonSolid: [hiru.buttonSolid, yoru.buttonSolid],
	switchTrack: [hiru.switchTrack, yoru.switchTrack],
	switchThumb: hiru.switchThumb,
	switchHover: [hiru.switchHover, yoru.switchHover],
	sidebarLabel: [hiru.sidebarLabel, yoru.sidebarLabel],
	tableStriped: [hiru.tableStriped, yoru.tableStriped],
	tabIndicator: [hiru.tabIndicator, yoru.tabIndicator],
} as const
