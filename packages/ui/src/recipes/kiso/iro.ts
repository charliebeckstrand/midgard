/**
 * Iro (色) — colour.
 *
 * The palette matrix, keyed by variant (solid / soft / outline / plain
 * / bare) × colour × slot (bg / text / hover / ring / border), plus
 * the semantic intent-colour text bundle. Each shade entry pairs a
 * light class with its `dark:` counterpart so both literals survive
 * Tailwind's source scan.
 *
 * Surfaces live in `omote`. Interaction-state text colours live in
 * `hannou.text`. Slot-specific composites live in their kata.
 *
 * Layer: kiso · Concern: colour
 */

import { mode, shades } from '../../core/recipe'

const text = shades({
	zinc: ['text-zinc-700', 'dark:text-zinc-400'],
	red: ['text-red-700', 'dark:text-red-400'],
	amber: ['text-amber-700', 'dark:text-amber-400'],
	green: ['text-green-700', 'dark:text-green-400'],
	blue: ['text-blue-700', 'dark:text-blue-400'],
})

const textBundle = {
	default: mode('text-zinc-950', 'dark:text-white'),
	primary: mode('text-blue-600', 'dark:text-blue-500'),
	success: mode('text-green-600', 'dark:text-green-500'),
	warning: mode('text-amber-600', 'dark:text-amber-500'),
	error: mode('text-red-600', 'dark:text-red-500'),
	muted: mode('text-zinc-500', 'dark:text-zinc-400'),
}

const hover = shades({
	zinc: ['not-disabled:hover:bg-zinc-600/15', 'dark:not-disabled:hover:bg-zinc-500/15'],
	red: ['not-disabled:hover:bg-red-600/15', 'dark:not-disabled:hover:bg-red-500/15'],
	amber: ['not-disabled:hover:bg-amber-500/15', 'dark:not-disabled:hover:bg-amber-500/15'],
	green: ['not-disabled:hover:bg-green-600/15', 'dark:not-disabled:hover:bg-green-500/15'],
	blue: ['not-disabled:hover:bg-blue-600/15', 'dark:not-disabled:hover:bg-blue-500/15'],
})

const solid = {
	bg: shades({
		zinc: 'bg-zinc-600',
		red: 'bg-red-600',
		amber: 'bg-amber-500',
		green: 'bg-green-600',
		blue: 'bg-blue-600',
	}),
	text: shades({
		zinc: 'text-white',
		red: 'text-white',
		amber: 'text-amber-950',
		green: 'text-white',
		blue: 'text-white',
	}),
	hover: shades({
		zinc: 'not-disabled:hover:bg-zinc-700',
		red: 'not-disabled:hover:bg-red-700',
		amber: 'not-disabled:hover:bg-amber-600',
		green: 'not-disabled:hover:bg-green-700',
		blue: 'not-disabled:hover:bg-blue-700',
	}),
}

const soft = {
	bg: shades({
		zinc: 'bg-zinc-600/15',
		red: 'bg-red-600/15',
		amber: 'bg-amber-500/15',
		green: 'bg-green-600/15',
		blue: 'bg-blue-600/15',
	}),
	text,
	hover: shades({
		zinc: ['not-disabled:hover:bg-zinc-600/30', 'dark:not-disabled:hover:bg-zinc-500/30'],
		red: ['not-disabled:hover:bg-red-600/30', 'dark:not-disabled:hover:bg-red-500/30'],
		amber: ['not-disabled:hover:bg-amber-500/30', 'dark:not-disabled:hover:bg-amber-500/30'],
		green: ['not-disabled:hover:bg-green-600/30', 'dark:not-disabled:hover:bg-green-500/30'],
		blue: ['not-disabled:hover:bg-blue-600/30', 'dark:not-disabled:hover:bg-blue-500/30'],
	}),
}

const outline = {
	border: shades({
		zinc: ['border-zinc-800', 'dark:border-zinc-600'],
		red: ['border-red-600', 'dark:border-red-700'],
		amber: ['border-amber-500', 'dark:border-amber-700'],
		green: ['border-green-600', 'dark:border-green-700'],
		blue: ['border-blue-600', 'dark:border-blue-700'],
	}),
	ring: shades({
		zinc: ['ring-zinc-800', 'dark:ring-zinc-600'],
		red: ['ring-red-600', 'dark:ring-red-700'],
		amber: ['ring-amber-500', 'dark:ring-amber-700'],
		green: ['ring-green-600', 'dark:ring-green-700'],
		blue: ['ring-blue-600', 'dark:ring-blue-700'],
	}),
	text,
	hover,
}

const plain = { text, hover }

const bare = {
	text: shades({
		zinc: ['text-zinc-500', 'dark:text-zinc-400'],
		red: ['text-red-600', 'dark:text-red-500'],
		amber: ['text-amber-600', 'dark:text-amber-500'],
		green: ['text-green-600', 'dark:text-green-500'],
		blue: ['text-blue-600', 'dark:text-blue-500'],
	}),
	hover: shades({
		zinc: ['not-disabled:hover:text-zinc-950', 'dark:not-disabled:hover:text-white'],
		red: ['not-disabled:hover:text-red-700', 'dark:not-disabled:hover:text-red-400'],
		amber: ['not-disabled:hover:text-amber-700', 'dark:not-disabled:hover:text-amber-400'],
		green: ['not-disabled:hover:text-green-700', 'dark:not-disabled:hover:text-green-400'],
		blue: ['not-disabled:hover:text-blue-700', 'dark:not-disabled:hover:text-blue-400'],
	}),
}

const palette = { solid, soft, outline, plain, bare }

export const iro = {
	palette,
	text: textBundle,
}
