/**
 * Badge kata: the inline status/label chip. Recipe-shaped — a `variant` ×
 * `color` × `radius` matrix over the signature kasane chrome. The size steps
 * are `density-*` classes in the base, not an axis.
 * Reads `iro.extended` rather than `iro.palette`, so its `color` axis
 * carries the extended hues. The rest of the surface is the shared chromatic
 * palette wired through `bridge.palette`.
 */

import { defineScale, type ScaleStep } from '../../core/density'
import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { iro, ji, kasane, kokkaku, narabi, sen, shaku } from '../kiso'
import { dan } from '../kiso/dan'

const { extended } = iro
const { weight } = ji
const { rounded } = kasane
const { badge } = kokkaku
const { flex } = narabi
const { focus } = sen

/**
 * The hover wash of a link badge: one compound rule for each variant and color,
 * from the hover slot of the palette. A Button of the same variant and color
 * takes the same wash.
 */
const linkHover = (['solid', 'soft', 'outline', 'plain'] as const).flatMap((variant) =>
	Object.entries(extended[variant].hover).map(([color, hover]) => ({
		variant,
		color,
		interactive: true,
		class: hover,
	})),
)

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
			// chip-alignment lockstep (`kiso/control/affix.ts`).
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
			outline: 'ring-1 ring-inset',
		},
		radius: rounded,
		// A badge with an `href` is a link, and it takes the hover wash of its
		// variant and color. The classes are in the compound rules (`linkHover`). A
		// badge with no `href` is a label, so the pointer gets no response from it.
		interactive: {
			true: '',
			false: '',
		},
		// Opt into the wide palette: Badge's `color` axis carries the standard set
		// plus the extended hues (rose / violet / sky).
		palette: definePalette({
			...bridge.palette(extended),
			plain: extended.plain.text,
		}),
		// `radius: 'full'` caps swallow horizontal space, so pills read tighter than
		// the base `px` (tuned for the default `radius: 'md'`) — most visibly at small
		// sizes. Bump every pill one `px` step (the later class replaces the base
		// one in `tailwind-merge`); the shift stays uniform because the
		// `px` stops jump 0.5 (1.5 → 2 → 2.5), so lifting only the small end would
		// collapse sm onto md's px and kink the scale. Scoped to the pill, so the
		// base scale — and the affix `px` lockstep keyed off it — stays put.
		compound: [{ radius: 'full', class: dan.space.badge.pill }, ...linkHover],
		defaults: { variant: 'solid', color: 'zinc', radius: 'md', interactive: false },
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

/** Recipe variant props for {@link Badge} — the styling axes its kata exposes (`variant`, `color`, `radius`, `interactive`) and the `size` step, for consumers composing custom slots. */
export type BadgeVariants = Omit<
	VariantProps<typeof k>,
	'radius' | 'variant' | 'color' | 'interactive'
> & {
	/** The corner radius of the badge. @defaultValue 'md' */
	radius?: VariantProps<typeof k>['radius']
	/** The fill style of the badge. @defaultValue 'solid' */
	variant?: VariantProps<typeof k>['variant']
	/** The palette color of the badge. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
	/** Whether the badge is a link, which takes a hover wash. @defaultValue false */
	interactive?: VariantProps<typeof k>['interactive']
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: ScaleStep<typeof scale>
}
