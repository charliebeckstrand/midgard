/**
 * Iro (色) — colour.
 *
 * Semantic colour bundles and the palette matrix. The palette is keyed by
 * variant (solid / soft / outline / plain / bare) and slot (bg / text /
 * hover / ring / border). Each slot is a `Record<Color, string[]>` built
 * via `shades()`, so the dark mode prefix is added by the substrate, not
 * by the call site.
 *
 * Layer: ryū · Concern: colour
 */

import { iro as iroExisting } from '../../../recipes/ryu/iro'
import { shades } from './shades'

const text = shades({
	zinc: ['text-zinc-700', 'text-zinc-400'],
	red: ['text-red-700', 'text-red-400'],
	amber: ['text-amber-700', 'text-amber-400'],
	green: ['text-green-700', 'text-green-400'],
	blue: ['text-blue-700', 'text-blue-400'],
})

const hover = shades({
	zinc: ['not-disabled:hover:bg-zinc-600/15', 'not-disabled:hover:bg-zinc-500/15'],
	red: ['not-disabled:hover:bg-red-600/15', 'not-disabled:hover:bg-red-500/15'],
	amber: ['not-disabled:hover:bg-amber-500/15', 'not-disabled:hover:bg-amber-500/15'],
	green: ['not-disabled:hover:bg-green-600/15', 'not-disabled:hover:bg-green-500/15'],
	blue: ['not-disabled:hover:bg-blue-600/15', 'not-disabled:hover:bg-blue-500/15'],
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
		zinc: ['not-disabled:hover:bg-zinc-600/30', 'not-disabled:hover:bg-zinc-500/30'],
		red: ['not-disabled:hover:bg-red-600/30', 'not-disabled:hover:bg-red-500/30'],
		amber: ['not-disabled:hover:bg-amber-500/30', 'not-disabled:hover:bg-amber-500/30'],
		green: ['not-disabled:hover:bg-green-600/30', 'not-disabled:hover:bg-green-500/30'],
		blue: ['not-disabled:hover:bg-blue-600/30', 'not-disabled:hover:bg-blue-500/30'],
	}),
}

const outline = {
	border: shades({
		zinc: ['border-zinc-800', 'border-zinc-600'],
		red: ['border-red-600', 'border-red-700'],
		amber: ['border-amber-500', 'border-amber-700'],
		green: ['border-green-600', 'border-green-700'],
		blue: ['border-blue-600', 'border-blue-700'],
	}),
	ring: shades({
		zinc: ['ring-zinc-800', 'ring-zinc-600'],
		red: ['ring-red-600', 'ring-red-700'],
		amber: ['ring-amber-500', 'ring-amber-700'],
		green: ['ring-green-600', 'ring-green-700'],
		blue: ['ring-blue-600', 'ring-blue-700'],
	}),
	text,
	hover,
}

const plain = { text, hover }

const bare = {
	text: shades({
		zinc: ['text-zinc-500', 'text-zinc-400'],
		red: ['text-red-600', 'text-red-500'],
		amber: ['text-amber-600', 'text-amber-500'],
		green: ['text-green-600', 'text-green-500'],
		blue: ['text-blue-600', 'text-blue-500'],
	}),
	hover: shades({
		zinc: ['not-disabled:hover:text-zinc-950', 'not-disabled:hover:text-white'],
		red: ['not-disabled:hover:text-red-700', 'not-disabled:hover:text-red-400'],
		amber: ['not-disabled:hover:text-amber-700', 'not-disabled:hover:text-amber-400'],
		green: ['not-disabled:hover:text-green-700', 'not-disabled:hover:text-green-400'],
		blue: ['not-disabled:hover:text-blue-700', 'not-disabled:hover:text-blue-400'],
	}),
}

export const palette = { solid, soft, outline, plain, bare }

export const iro = {
	palette,
	// iro.text bundles (default / muted / inherit / hover / focus / disabled /
	// tab / success / error) aren't part of the palette × colour matrix and
	// haven't been rewritten yet — pulled from `recipes/ryu/iro` pending a port.
	text: iroExisting.text,
}
