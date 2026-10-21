/**
 * Badge kata: the inline status/label chip. Recipe-shaped: a `variant` ×
 * `color` × `radius` matrix over the signature kasane chrome. The size steps
 * are `density-*` classes in the base, not an axis.
 * Its `color` axis carries the standard hues and the extended hues (rose /
 * violet / sky), and its palette writes each variant and color as one literal
 * class string.
 */

import { defineScale, type ScaleStep } from '../../core/density'
import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { dan, ji, kasane, kokkaku, narabi, sen, shaku } from '../kiso'

const { weight } = ji
const { rounded } = kasane
const { badge } = kokkaku
const { flex } = narabi
const { focus, ring } = sen

export const k = defineRecipe(
	{
		base: [
			'group',
			flex.inline,
			'w-fit',
			weight.medium,
			// The ring shows only on keyboard focus, so a label badge, which takes no
			// focus, never shows it.
			focus.ring,
			// A uniform 4px height scale: the type ramp (text-xs → text-lg) sets the
			// step while vertical padding holds constant (`py-ring-1`), landing
			// xs/sm/md/lg on 22/26/30/34px. `md` matches a `sm` Button's 30px box.
			// Badges step 4px, not Button's 8px: a text line-height floors a badge
			// near 22px, so an 8px scale anchored at md=30 leaves no room for xs.
			// Horizontal padding still grows 0.5/step to hold the affix
			// chip-alignment lockstep (`kumi/control/affix.ts`).
			//
			// Each step is in a stepped `density-*` class: the badge takes the step of its
			// nearest density scope, and an explicit `size` makes the badge its own
			// scope. A LoadingSpinner follows the same scope, so it takes the step of
			// the badge with no projection. A bare icon element carries no size, so
			// the badge projects one onto its icon slots.
			dan.text.chip,
			dan.gap.badge,
			shaku.icon.slot.base,
			'py-ring-1',
			dan.space.badge.base,
		],
		variant: {
			outline: ring.line[1].inset,
		},
		radius: rounded,
		// One literal class string for each variant and color. A badge with an
		// `href` is a link, and it takes the hover wash of its variant and color
		// behind `[&[href]]:`. A badge with no `href` is a label, so the pointer
		// gets no response from it.
		palette: definePalette({
			solid: {
				zinc: 'bg-zinc-600 text-white [&[href]]:hover:bg-zinc-700',
				red: 'bg-red-600 text-white [&[href]]:hover:bg-red-700',
				amber: 'bg-amber-500 text-amber-950 [&[href]]:hover:bg-amber-600',
				green: 'bg-green-700 text-white [&[href]]:hover:bg-green-800',
				blue: 'bg-blue-600 text-white [&[href]]:hover:bg-blue-700',
				rose: 'bg-rose-600 text-white [&[href]]:hover:bg-rose-700',
				violet: 'bg-violet-600 text-white [&[href]]:hover:bg-violet-700',
				sky: 'bg-sky-700 text-white [&[href]]:hover:bg-sky-800',
			},
			soft: {
				zinc: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 [&[href]]:hover:bg-zinc-500/30',
				red: 'bg-red-500/15 text-red-700 dark:text-red-400 [&[href]]:hover:bg-red-500/30',
				amber: 'bg-amber-500/15 text-amber-800 dark:text-amber-400 [&[href]]:hover:bg-amber-500/30',
				green: 'bg-green-500/15 text-green-800 dark:text-green-400 [&[href]]:hover:bg-green-500/30',
				blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 [&[href]]:hover:bg-blue-500/30',
				rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 [&[href]]:hover:bg-rose-500/30',
				violet:
					'bg-violet-500/15 text-violet-700 dark:text-violet-400 [&[href]]:hover:bg-violet-500/30',
				sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 [&[href]]:hover:bg-sky-500/30',
			},
			outline: {
				zinc: 'ring-zinc-800 dark:ring-zinc-600 text-zinc-700 dark:text-zinc-400 [&[href]]:hover:bg-zinc-500/15',
				red: 'ring-red-600 dark:ring-red-700 text-red-700 dark:text-red-400 [&[href]]:hover:bg-red-500/15',
				amber:
					'ring-amber-500 dark:ring-amber-600 text-amber-800 dark:text-amber-400 [&[href]]:hover:bg-amber-500/15',
				green:
					'ring-green-600 dark:ring-green-700 text-green-800 dark:text-green-400 [&[href]]:hover:bg-green-500/15',
				blue: 'ring-blue-600 dark:ring-blue-700 text-blue-700 dark:text-blue-400 [&[href]]:hover:bg-blue-500/15',
				rose: 'ring-rose-600 dark:ring-rose-700 text-rose-700 dark:text-rose-400 [&[href]]:hover:bg-rose-500/15',
				violet:
					'ring-violet-600 dark:ring-violet-700 text-violet-700 dark:text-violet-400 [&[href]]:hover:bg-violet-500/15',
				sky: 'ring-sky-600 dark:ring-sky-700 text-sky-700 dark:text-sky-400 [&[href]]:hover:bg-sky-500/15',
			},
			plain: {
				zinc: 'text-zinc-700 dark:text-zinc-400 [&[href]]:hover:bg-zinc-500/15',
				red: 'text-red-700 dark:text-red-400 [&[href]]:hover:bg-red-500/15',
				amber: 'text-amber-800 dark:text-amber-400 [&[href]]:hover:bg-amber-500/15',
				green: 'text-green-800 dark:text-green-400 [&[href]]:hover:bg-green-500/15',
				blue: 'text-blue-700 dark:text-blue-400 [&[href]]:hover:bg-blue-500/15',
				rose: 'text-rose-700 dark:text-rose-400 [&[href]]:hover:bg-rose-500/15',
				violet: 'text-violet-700 dark:text-violet-400 [&[href]]:hover:bg-violet-500/15',
				sky: 'text-sky-700 dark:text-sky-400 [&[href]]:hover:bg-sky-500/15',
			},
		}),
		// `radius: 'full'` caps swallow horizontal space, so pills read tighter than
		// the base `px` (tuned for the default `radius: 'md'`): most visibly at small
		// sizes. Bump every pill one `px` step (the later class replaces the base
		// one in `tailwind-merge`); the shift stays uniform because the
		// `px` stops jump 0.5 (1.5 → 2 → 2.5), so lifting only the small end would
		// collapse sm onto md's px and kink the scale. Scoped to the pill, so the
		// base scale (and the affix `px` lockstep keyed off it) stays put.
		compound: [{ radius: 'full', class: dan.space.badge.pill }],
		defaults: { variant: 'solid', color: 'zinc', radius: 'md' },
		skeleton: badge,
	},
	{
		/**
		 * The leading pad of a removable chip: an `outline` pill whose suffix is
		 * a `bare` remove Button with no `size`. `BadgeRemovable` builds the
		 * chip of TagInput, QueryChips, and ChatPrompt this way.
		 *
		 * The padding of the button insets its glyph from the trailing edge. So
		 * the leading side takes the `px` of the pill plus the `bare` pad of the
		 * button, and the label sits symmetric with the glyph. The class is gated
		 * on `data-has-suffix`, so a chip with no button keeps the symmetric
		 * `px`. The button takes the step of the chip, so the pad is a stepped
		 * class. `removable-chip-pad.test.ts` holds the sum at each step.
		 */
		removable: dan.space.badge.removable,
	},
)

/** The size scale of {@link Badge}: the steps of its text, gap, padding, and skeleton box. */
export const scale = defineScale(
	dan.text.chip,
	dan.gap.badge,
	dan.space.badge.base,
	dan.space.badge.pill,
	dan.size.badge.base,
	dan.size.badge.width,
)

/** Recipe variant props for {@link Badge}: the styling axes its kata exposes (`variant`, `color`, `radius`) and the `size` step, for consumers composing custom slots. */
export type BadgeVariants = Omit<VariantProps<typeof k>, 'radius' | 'variant' | 'color'> & {
	/** The corner radius of the badge. @defaultValue 'md' */
	radius?: VariantProps<typeof k>['radius']
	/** The fill style of the badge. @defaultValue 'solid' */
	variant?: VariantProps<typeof k>['variant']
	/** The palette color of the badge. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: ScaleStep<typeof scale>
}
