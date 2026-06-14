/**
 * Iro spectrum (色相): the opt-in **wide palette**. Mirrors `iro.palette`'s
 * shape (solid / soft / outline / plain / bare) but keyed by
 * {@link PaletteColor} — every standard colour plus the extended set
 * (mist / rose / violet / sky). A kata reading this bundle instead of
 * `iro.palette` offers the broader `color` axis; the standard palette and
 * the components that read it are untouched.
 *
 * The extended hues are authored color-major like the standard `ramp`: one
 * row per colour naming the foreground role shades it plays, light value
 * first and the `dark:`-prefixed value second (Tailwind's scanner sees only
 * full literals). Shades were tuned against the `contrast.test.ts` guard so
 * every rung clears its floor — `onSurface` (bare text) and `onTint`
 * (plain / soft / outline text) on both the page surface and the 15% soft
 * wash, in both modes. Solid fills carry white text at a shade that clears
 * text AA on the fill.
 *
 * Layer: kiso · Concern: extended palette
 */

import { type Color, type ExtendedColor, type PaletteColor, shades } from '../../../core/recipe'

import { bare } from './bare'
import { outline } from './outline'
import { plain } from './plain'
import { soft } from './soft'
import { solid } from './solid'

type Pair = readonly [light: string, dark: string]

type Ramp = { onSurface: Pair; onTint: Pair }

const RAMP = {
	mist: {
		onSurface: ['text-mist-600', 'dark:text-mist-400'],
		onTint: ['text-mist-700', 'dark:text-mist-300'],
	},
	rose: {
		onSurface: ['text-rose-600', 'dark:text-rose-500'],
		onTint: ['text-rose-700', 'dark:text-rose-400'],
	},
	violet: {
		onSurface: ['text-violet-600', 'dark:text-violet-400'],
		onTint: ['text-violet-700', 'dark:text-violet-400'],
	},
	sky: {
		onSurface: ['text-sky-700', 'dark:text-sky-500'],
		onTint: ['text-sky-700', 'dark:text-sky-400'],
	},
} satisfies Record<ExtendedColor, Ramp>

/** Project one role across the extended colours into the engine's `[light, dark]` map. */
function project(role: keyof Ramp): Record<ExtendedColor, [light: string, dark: string]> {
	return Object.fromEntries(
		(Object.entries(RAMP) as [ExtendedColor, Ramp][]).map(([color, rung]) => [
			color,
			[...rung[role]],
		]),
	) as Record<ExtendedColor, [light: string, dark: string]>
}

/** Extended foreground on the page / card surface; bare text and the future intent of these hues. */
export const onSurface = project('onSurface')

/** Extended foreground on the 15% soft fill; plain / soft / outline text. */
export const onTint = project('onTint')

/** Merge a standard per-colour slot with its extended counterpart into the wide-keyed map. */
function wide(
	standard: Record<Color, string[]>,
	extended: Record<ExtendedColor, string[]>,
): Record<PaletteColor, string[]> {
	return { ...standard, ...extended } as Record<PaletteColor, string[]>
}

const extendedSolid = {
	bg: shades<ExtendedColor>({
		mist: 'bg-mist-600',
		rose: 'bg-rose-600',
		violet: 'bg-violet-600',
		sky: 'bg-sky-700',
	}),
	text: shades<ExtendedColor>({
		mist: 'text-white',
		rose: 'text-white',
		violet: 'text-white',
		sky: 'text-white',
	}),
	hover: shades<ExtendedColor>({
		mist: 'not-disabled:hover:bg-mist-700',
		rose: 'not-disabled:hover:bg-rose-700',
		violet: 'not-disabled:hover:bg-violet-700',
		sky: 'not-disabled:hover:bg-sky-800',
	}),
}

const extendedSoft = {
	bg: shades<ExtendedColor>({
		mist: 'bg-mist-600/15',
		rose: 'bg-rose-600/15',
		violet: 'bg-violet-600/15',
		sky: 'bg-sky-600/15',
	}),
	hover: shades<ExtendedColor>({
		mist: ['not-disabled:hover:bg-mist-600/30', 'dark:not-disabled:hover:bg-mist-500/30'],
		rose: ['not-disabled:hover:bg-rose-600/30', 'dark:not-disabled:hover:bg-rose-500/30'],
		violet: ['not-disabled:hover:bg-violet-600/30', 'dark:not-disabled:hover:bg-violet-500/30'],
		sky: ['not-disabled:hover:bg-sky-600/30', 'dark:not-disabled:hover:bg-sky-500/30'],
	}),
}

/** Shared low-alpha hover wash for the plain / soft / outline variants. */
const extendedHover = shades<ExtendedColor>({
	mist: ['not-disabled:hover:bg-mist-600/15', 'dark:not-disabled:hover:bg-mist-500/15'],
	rose: ['not-disabled:hover:bg-rose-600/15', 'dark:not-disabled:hover:bg-rose-500/15'],
	violet: ['not-disabled:hover:bg-violet-600/15', 'dark:not-disabled:hover:bg-violet-500/15'],
	sky: ['not-disabled:hover:bg-sky-600/15', 'dark:not-disabled:hover:bg-sky-500/15'],
})

const extendedOutline = {
	border: shades<ExtendedColor>({
		mist: ['border-mist-600', 'dark:border-mist-700'],
		rose: ['border-rose-600', 'dark:border-rose-700'],
		violet: ['border-violet-600', 'dark:border-violet-700'],
		sky: ['border-sky-600', 'dark:border-sky-700'],
	}),
	ring: shades<ExtendedColor>({
		mist: ['ring-mist-600', 'dark:ring-mist-700'],
		rose: ['ring-rose-600', 'dark:ring-rose-700'],
		violet: ['ring-violet-600', 'dark:ring-violet-700'],
		sky: ['ring-sky-600', 'dark:ring-sky-700'],
	}),
}

/** Bare hover: the muted foreground steps to the stronger `onTint` shade. */
const extendedBareHover = shades<ExtendedColor>({
	mist: ['not-disabled:hover:text-mist-700', 'dark:not-disabled:hover:text-mist-300'],
	rose: ['not-disabled:hover:text-rose-700', 'dark:not-disabled:hover:text-rose-400'],
	violet: ['not-disabled:hover:text-violet-700', 'dark:not-disabled:hover:text-violet-400'],
	sky: ['not-disabled:hover:text-sky-700', 'dark:not-disabled:hover:text-sky-400'],
})

export const spectrum = {
	solid: {
		bg: wide(solid.bg, extendedSolid.bg),
		text: wide(solid.text, extendedSolid.text),
		hover: wide(solid.hover, extendedSolid.hover),
	},
	soft: {
		bg: wide(soft.bg, extendedSoft.bg),
		text: wide(soft.text, onTint),
		hover: wide(soft.hover, extendedSoft.hover),
	},
	outline: {
		border: wide(outline.border, extendedOutline.border),
		ring: wide(outline.ring, extendedOutline.ring),
		text: wide(outline.text, onTint),
		hover: wide(outline.hover, extendedHover),
	},
	plain: {
		text: wide(plain.text, onTint),
		hover: wide(plain.hover, extendedHover),
	},
	bare: {
		text: wide(bare.text, onSurface),
		hover: wide(bare.hover, extendedBareHover),
	},
} as const
