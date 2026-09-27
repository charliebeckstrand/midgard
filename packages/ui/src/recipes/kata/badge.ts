/**
 * Badge kata: the inline status/label chip. Recipe-shaped — a `variant` ×
 * `color` × `radius` matrix over the signature kasane chrome. The size steps
 * are `density-*` classes in the base, not an axis.
 * Reads `iro.extendedPalette` rather than `iro.palette`, so its `color` axis
 * carries the extended hues. The rest of the surface is the shared chromatic
 * palette wired through `basePalette`.
 */
import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { type DensityStep, iro, ji, kasane, kokkaku, narabi, shaku } from '../kiso'

const { extendedPalette } = iro
const { weight } = ji
const { padding, rounded } = kasane
const { badge } = kokkaku
const { flex } = narabi
const { iconSlotRamp: icon } = shaku

/** The `px` stop of each step. */
const px = { xs: '1', sm: '1.5', md: '2', lg: '2.5' } as const

/** The `px` stop of each step of a `radius: 'full'` pill: one stop above {@link px}. */
const pillPx = { xs: '1.5', sm: '2', md: '2.5', lg: '3' } as const

export const k = defineRecipe({
	base: [
		'group',
		flex.inline,
		'w-fit',
		weight.medium,
		// A uniform 4px height scale: the type ramp (text-xs → text-lg) sets the
		// step while vertical padding holds constant (py('1')), landing
		// xs/sm/md/lg on 22/26/30/34px. `md` matches a `sm` Button's 30px box.
		// Badges step 4px, not Button's 8px: a text line-height floors a badge
		// near 22px, so an 8px scale anchored at md=30 leaves no room for xs.
		// Horizontal padding still grows 0.5/step to hold the affix
		// chip-alignment lockstep (`kiso/control/affix.ts`).
		//
		// Each step is a `density-*` class: the badge takes the step of its
		// nearest density scope, and an explicit `size` makes the badge its own
		// scope. A LoadingSpinner follows the same scope, so it takes the step of
		// the badge with no projection. A bare icon element carries no size, so
		// the badge projects one onto its icon slots.
		'density-xs:text-xs density-sm:text-sm density-md:text-base density-lg:text-lg',
		'density-xs:gap-0.5 density-sm:gap-0.75 density-md:gap-1 density-lg:gap-1.25',
		icon,
		padding.py('1'),
		padding.pxRamp(px),
	],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	radius: rounded,
	// Opt into the wide palette: Badge's `color` axis carries the standard set
	// plus the extended hues (rose / violet / sky).
	palette: definePalette({ ...basePalette(extendedPalette), plain: extendedPalette.plain.text }),
	// `radius: 'full'` caps swallow horizontal space, so pills read tighter than
	// the base `px` (tuned for the default `radius: 'md'`) — most visibly at small
	// sizes. Bump every pill one `px` step; the shift stays uniform because the
	// `px` stops jump 0.5 (1.5 → 2 → 2.5), so lifting only the small end would
	// collapse sm onto md's px and kink the scale. Scoped to the pill, so the
	// base scale — and the affix `px` lockstep keyed off it — stays put.
	compound: [{ radius: 'full', class: padding.pxRamp(pillPx) }],
	defaults: { variant: 'soft', color: 'zinc', radius: 'md' },
	skeleton: badge,
})

/** The steps a badge takes: `xl` has no badge step. */
export type BadgeSize = Exclude<DensityStep, 'xl'>

/** Recipe variant props for {@link Badge} — the styling axes its kata exposes (`variant`, `color`, `radius`) and the `size` step, for consumers composing custom slots. */
export type BadgeVariants = VariantProps<typeof k> & {
	/** The step. Omit it to follow the nearest density scope, `md` outside one. */
	size?: BadgeSize
}
