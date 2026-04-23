import { defineColors } from '../../core/recipe/mode'

export const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export type Color = (typeof colors)[number]

// ── Shared slots ────────────────────────────────────────

const text = defineColors({
	zinc: { light: 'text-zinc-700', dark: 'dark:text-zinc-400' },
	red: { light: 'text-red-700', dark: 'dark:text-red-400' },
	amber: { light: 'text-amber-700', dark: 'dark:text-amber-400' },
	green: { light: 'text-green-700', dark: 'dark:text-green-400' },
	blue: { light: 'text-blue-700', dark: 'dark:text-blue-400' },
})

const hover = defineColors({
	zinc: {
		light: 'not-disabled:hover:bg-zinc-600/15',
		dark: 'dark:not-disabled:hover:bg-zinc-500/15',
	},
	red: {
		light: 'not-disabled:hover:bg-red-600/15',
		dark: 'dark:not-disabled:hover:bg-red-500/15',
	},
	amber: {
		light: 'not-disabled:hover:bg-amber-500/15',
		dark: 'dark:not-disabled:hover:bg-amber-500/15',
	},
	green: {
		light: 'not-disabled:hover:bg-green-600/15',
		dark: 'dark:not-disabled:hover:bg-green-500/15',
	},
	blue: {
		light: 'not-disabled:hover:bg-blue-600/15',
		dark: 'dark:not-disabled:hover:bg-blue-500/15',
	},
})

// ── Solid ────────────────────────────────────────────────

export const solid = {
	bg: defineColors({
		zinc: 'bg-zinc-600',
		red: 'bg-red-600',
		amber: 'bg-amber-500',
		green: 'bg-green-600',
		blue: 'bg-blue-600',
	}),
	text: defineColors({
		zinc: 'text-white',
		red: 'text-white',
		amber: 'text-amber-950',
		green: 'text-white',
		blue: 'text-white',
	}),
	hover: defineColors({
		zinc: 'not-disabled:hover:bg-zinc-700',
		red: 'not-disabled:hover:bg-red-700',
		amber: 'not-disabled:hover:bg-amber-600',
		green: 'not-disabled:hover:bg-green-700',
		blue: 'not-disabled:hover:bg-blue-700',
	}),
}

// ── Soft ─────────────────────────────────────────────────

export const soft = {
	bg: defineColors({
		zinc: 'bg-zinc-600/15',
		red: 'bg-red-600/15',
		amber: 'bg-amber-500/15',
		green: 'bg-green-600/15',
		blue: 'bg-blue-600/15',
	}),
	text,
	hover: defineColors({
		zinc: {
			light: 'not-disabled:hover:bg-zinc-600/30',
			dark: 'dark:not-disabled:hover:bg-zinc-500/30',
		},
		red: {
			light: 'not-disabled:hover:bg-red-600/30',
			dark: 'dark:not-disabled:hover:bg-red-500/30',
		},
		amber: {
			light: 'not-disabled:hover:bg-amber-500/30',
			dark: 'dark:not-disabled:hover:bg-amber-500/30',
		},
		green: {
			light: 'not-disabled:hover:bg-green-600/30',
			dark: 'dark:not-disabled:hover:bg-green-500/30',
		},
		blue: {
			light: 'not-disabled:hover:bg-blue-600/30',
			dark: 'dark:not-disabled:hover:bg-blue-500/30',
		},
	}),
}

// ── Outline ─────────────────────────────────────────────

export const outline = {
	border: defineColors({
		zinc: { light: 'border-zinc-800', dark: 'dark:border-zinc-600' },
		red: { light: 'border-red-600', dark: 'dark:border-red-700' },
		amber: { light: 'border-amber-500', dark: 'dark:border-amber-700' },
		green: { light: 'border-green-600', dark: 'dark:border-green-700' },
		blue: { light: 'border-blue-600', dark: 'dark:border-blue-700' },
	}),
	ring: defineColors({
		zinc: { light: 'ring-zinc-800', dark: 'dark:ring-zinc-600' },
		red: { light: 'ring-red-600', dark: 'dark:ring-red-700' },
		amber: { light: 'ring-amber-500', dark: 'dark:ring-amber-700' },
		green: { light: 'ring-green-600', dark: 'dark:ring-green-700' },
		blue: { light: 'ring-blue-600', dark: 'dark:ring-blue-700' },
	}),
	text,
	hover,
}

// ── Plain ───────────────────────────────────────────────

export const plain = {
	text,
	hover,
}
