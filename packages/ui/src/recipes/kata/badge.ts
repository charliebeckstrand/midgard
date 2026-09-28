/**
 * Badge kata: the inline status/label chip. Recipe-shaped — a `variant` ×
 * `color` × `radius` matrix over the signature kasane chrome. The size steps
 * are `density-*` classes in the base, not an axis.
 * Reads `iro.extendedPalette` rather than `iro.palette`, so its `color` axis
 * carries the extended hues. The rest of the surface is the shared chromatic
 * palette wired through `basePalette`.
 */

import type { DensityStep } from '../../core/density'
import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { iro, ji, kasane, kokkaku, narabi, shaku } from '../kiso'

const { extendedPalette } = iro
const { weight } = ji
const { rounded } = kasane
const { badge } = kokkaku
const { flex } = narabi
const { iconSlotRamp } = shaku

export const k = defineRecipe(
	{
		base: [
			'group',
			flex.inline,
			'w-fit',
			weight.medium,
			// A uniform 4px height scale: the type ramp (text-xs → text-lg) sets the
			// step while vertical padding holds constant (`py-ring-1`), landing
			// xs/sm/md/lg on 22/26/30/34px. `md` matches a `sm` Button's 30px box.
			// Badges step 4px, not Button's 8px: a text line-height floors a badge
			// near 22px, so an 8px scale anchored at md=30 leaves no room for xs.
			// Horizontal padding still grows 0.5/step to hold the affix
			// chip-alignment lockstep (`kiso/control/affix.ts`).
			//
			// Each step is in a stepped `density-*` class: the badge takes the step of its
			// nearest density scope, and an explicit `size` makes the badge its own
			// scope. A LoadingSpinner follows the same scope, so it takes the step of
			// the badge with no projection. A bare icon element carries no size, so
			// the badge projects one onto its icon slots.
			'density-text-[xs,sm,base,lg,lg]',
			'density-gap-[0.5,0.75,1,1.25,1.25]',
			iconSlotRamp,
			'py-ring-1',
			'density-px-ring-[1,1.5,2,2.5,2.5]',
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
		// sizes. Bump every pill one `px` step (the later class replaces the base
		// one in `tailwind-merge`); the shift stays uniform because the
		// `px` stops jump 0.5 (1.5 → 2 → 2.5), so lifting only the small end would
		// collapse sm onto md's px and kink the scale. Scoped to the pill, so the
		// base scale — and the affix `px` lockstep keyed off it — stays put.
		compound: [{ radius: 'full', class: 'density-px-ring-[1.5,2,2.5,3,3]' }],
		defaults: { variant: 'soft', color: 'zinc', radius: 'md' },
		skeleton: badge,
	},
	{
		/**
		 * The leading pad of a removable chip: an `outline` pill whose suffix is
		 * a `bare` remove Button with no `size`. TagInput, QueryChips, and
		 * ChatPrompt build their chips this way.
		 *
		 * The padding of the button insets its glyph from the trailing edge. So
		 * the leading side takes the `px` of the pill plus the `bare` pad of the
		 * button, and the label sits symmetric with the glyph. The class is gated
		 * on `data-has-suffix`, so a chip with no button keeps the symmetric
		 * `px`. The button takes the step of the chip, so the pad is a stepped
		 * class. `removable-chip-pad-boundary.test.ts` holds the sum at each step.
		 */
		removable: 'data-[has-suffix]:density-ps-ring-[2.25,3,3.75,4.5,4.5]',
	},
)

/** Recipe variant props for {@link Badge} — the styling axes its kata exposes (`variant`, `color`, `radius`) and the `size` step, for consumers composing custom slots. */
export type BadgeVariants = VariantProps<typeof k> & {
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: DensityStep
}
