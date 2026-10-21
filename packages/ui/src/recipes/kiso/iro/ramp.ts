/**
 * Iro ramp: the color-major source of truth for foreground shades, projected
 * into the role-major maps consumers read.
 *
 * One row per palette color naming the shade each *role* plays as a foreground,
 * light value first and the `dark:`-prefixed value second. The values are full
 * class literals (Tailwind's scanner sees only literals; nothing is composed at
 * runtime). Each shade is the least-emphatic rung that clears its contrast
 * floor on its surface. A few taste bumps are the exception: amber / green ride
 * a lighter dark rung, and the zinc `marker` rides the stronger light rung
 * (600), so a neutral spinner or star reads as firmly as a chromatic one.
 *
 * The chromatic kata (Alert, Avatar, Badge, Button) write their own literal
 * palette strings. Their muted `bare` text uses the `onSurface` shades, and
 * their soft, outline, and plain text is one rung stronger, for the 15% soft
 * fill. `contrast.test.ts` measures those strings in place.
 *
 * Roles:
 *   - `onSurface`: foreground on the page / card surface (white · zinc-900).
 *     The semantic intent bundle reads this; clears AA (4.5:1) on its own
 *     surface. The neutral washes are a different ground with their own rung:
 *     `onWash.muted` below.
 *   - `marker`: chromatic dot / glyph (status, spinner, timeline) on the page
 *     surface. Graphical; the non-text 3:1 floor (1.4.11) lands a rung lighter
 *     than the text ramp for the low-contrast hues.
 *
 * The `__tests__/recipes/contrast.test.ts` guard re-derives every rung's
 * contrast from Tailwind's own theme and asserts it clears its floor in both
 * modes. Edit a shade here and the guard proves it still clears.
 *
 * Layer: kiso · Concern: color ramp
 */

import type { Color } from '../../../core/recipe'

import { type Pair, project } from './project'

type ColorRamp = {
	onSurface: Pair
	marker: Pair
}

const RAMP = {
	zinc: {
		onSurface: ['text-zinc-500', 'dark:text-zinc-400'],
		marker: ['text-zinc-600', 'dark:text-zinc-400'],
	},
	red: {
		onSurface: ['text-red-600', 'dark:text-red-500'],
		marker: ['text-red-600', 'dark:text-red-500'],
	},
	amber: {
		onSurface: ['text-amber-700', 'dark:text-amber-500'],
		marker: ['text-amber-600', 'dark:text-amber-500'],
	},
	green: {
		onSurface: ['text-green-700', 'dark:text-green-500'],
		marker: ['text-green-600', 'dark:text-green-500'],
	},
	blue: {
		onSurface: ['text-blue-600', 'dark:text-blue-500'],
		marker: ['text-blue-600', 'dark:text-blue-500'],
	},
} satisfies Record<Color, ColorRamp>

export const onSurface = project(RAMP, 'onSurface')
export const marker = project(RAMP, 'marker')

/** Max-emphasis neutral foreground: the `default` intent and the `bare` zinc hover. */
export const strong: [light: string, dark: string] = ['text-zinc-950', 'dark:text-white']

/**
 * Foregrounds for the neutral wash: the translucent zinc/white overlay a row,
 * track, or item sits on when it is hovered, roved, or otherwise picked out.
 * Keyed by purpose, like `intent`, since what varies here is emphasis rather
 * than hue; `muted` is the only rung so far.
 *
 * `wash`, not `tint`: the text of a soft Badge or Button sits on the *chromatic*
 * 15% soft fill. Its zinc rung (`text-zinc-700`, 9.40:1 here) is darker than
 * this ground asks for. Two different grounds, so two names.
 *
 * One rung spans both neutral washes, which differ only in dark:
 * `omote.bg.tint` (`bg-zinc-950/5` · `dark:bg-white/10`) and `hannou.tint` /
 * `hannou.active` (`bg-zinc-950/5` · `dark:bg-white/5`). Dark's harder case is
 * the heavier overlay, since a lighter ground costs light ink contrast.
 * `zinc-400` already clears it at 5.07:1 over `dark:bg-white/10` on `zinc-900`.
 *
 * Light is what forced the fork. `muted` is the `onSurface` zinc rung, tuned
 * for the page / card surface. On the wash `bg-zinc-950/5` composites to
 * `#f3f3f3`, where `zinc-500` measures 4.34:1 and misses the 4.5:1 text floor
 * (WCAG 1.4.3). `zinc-600` clears it at 6.95:1 and is the least-emphatic rung
 * that does, so the step to `strong` survives. Legal on the page surface too
 * (7.73:1), which is why `kata/list` inks one rung across every row variant.
 *
 * Two paths deliberately not taken. Raising `muted` itself to `zinc-600` would
 * delete this fork, but many recipes read `muted`. `zinc-500` is the
 * correct least-emphatic rung *for the page*: a design call, not an
 * engineering one. And a further color-major `RAMP` role would force red /
 * amber / green / blue rungs with no consumer to size them against. When a
 * *chromatic* ink first lands on this wash it joins here as a color-keyed
 * sibling (`onWash.palette`), not as a role inside `RAMP`.
 *
 * `__tests__/recipes/contrast.test.ts` measures this rung against the wash for
 * every kata registered in `TINT_CONSUMERS`. That registry reconciles on every
 * spelling that reaches a wash: `bg.tint` for the opaque fill, `hannou.tint` /
 * `hannou.active` / the item group (`kumi/item`) for the interaction ones. Each entry names
 * the ground its inks land on, so the two grounds are measured apart where dark
 * parts them.
 */
export const onWash = {
	muted: ['text-zinc-600', 'dark:text-zinc-400'] as [light: string, dark: string],
} as const
