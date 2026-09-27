/**
 * Badge kata: the inline status/label chip. Recipe-shaped — a `variant` ×
 * `color` × `size` × `radius` matrix over the signature kasane chrome.
 * Reads `iro.extendedPalette` rather than `iro.palette`, so its `color` axis
 * carries the extended hues. The rest of the surface is the shared chromatic
 * palette wired through `basePalette`.
 */
import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { iro, ji, kasane, kokkaku, narabi, shaku } from '../kiso'

const { extendedPalette } = iro
const { size, weight } = ji
const { gap, padding, rounded } = kasane
const { badge } = kokkaku
const { flex } = narabi
const { icon } = shaku

export const k = defineRecipe(
	{
		base: ['group', flex.inline, 'w-fit', weight.medium],
		variant: {
			outline: 'ring-1 ring-inset',
		},
		// A uniform 4px height scale: the type ramp (text-xs → text-lg) sets the
		// step while vertical padding holds constant (py('1')), landing
		// xs/sm/md/lg on 22/26/30/34px. `md` matches a `sm` Button's 30px box.
		// Badges step 4px, not Button's 8px: a text line-height floors a badge
		// near 22px, so an 8px scale anchored at md=30 leaves no room for xs.
		// Horizontal padding still grows 0.5/step to hold the affix
		// chip-alignment lockstep (`kiso/control/affix.ts`).
		// A LoadingSpinner reads no context, so each row projects the size of its
		// icon row onto it.
		size: {
			xs: [
				size.xs,
				icon.xs,
				gap.g('0.5'),
				padding.py('1'),
				padding.px('1'),
				'*:data-[slot=loading-spinner]:size-3',
			],
			sm: [
				size.sm,
				icon.sm,
				gap.g('0.75'),
				padding.py('1'),
				padding.px('1.5'),
				'*:data-[slot=loading-spinner]:size-4',
			],
			md: [
				size.md,
				icon.md,
				gap.g('1'),
				padding.py('1'),
				padding.px('2'),
				'*:data-[slot=loading-spinner]:size-5',
			],
			lg: [
				size.lg,
				icon.lg,
				gap.g('1.25'),
				padding.py('1'),
				padding.px('2.5'),
				'*:data-[slot=loading-spinner]:size-6',
			],
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
		compound: [
			{ radius: 'full', size: 'xs', class: padding.px('1.5') },
			{ radius: 'full', size: 'sm', class: padding.px('2') },
			{ radius: 'full', size: 'md', class: padding.px('2.5') },
			{ radius: 'full', size: 'lg', class: padding.px('3') },
		],
		defaults: { variant: 'soft', color: 'zinc', size: 'md', radius: 'md' },
		skeleton: badge,
	},
	{
		// An unsized badge follows the nearest density scope (`ui/tailwind.css`).
		// Each row is the `size` row, or the pill `compound` row, of its step
		// under the matching `density-*` variant. The md rows reset an outer scope.
		// Tailwind scans whole class literals, so the rows can't be built from the
		// `size` rows. `density-rows.test.ts` keeps them in step.
		density: {
			size: {
				sm: [
					'density-sm:text-sm',
					'density-sm:*:data-[slot=icon]:size-4',
					'density-sm:*:data-[slot=icon]:shrink-0',
					'density-sm:gap-0.75',
					'density-sm:py-[calc(--spacing(1)-1px)]',
					'density-sm:px-[calc(--spacing(1.5)-1px)]',
					'density-sm:*:data-[slot=loading-spinner]:size-4',
				],
				md: [
					'density-md:text-base',
					'density-md:*:data-[slot=icon]:size-5',
					'density-md:*:data-[slot=icon]:shrink-0',
					'density-md:gap-1',
					'density-md:py-[calc(--spacing(1)-1px)]',
					'density-md:px-[calc(--spacing(2)-1px)]',
					'density-md:*:data-[slot=loading-spinner]:size-5',
				],
				lg: [
					'density-lg:text-lg',
					'density-lg:*:data-[slot=icon]:size-6',
					'density-lg:*:data-[slot=icon]:shrink-0',
					'density-lg:gap-1.25',
					'density-lg:py-[calc(--spacing(1)-1px)]',
					'density-lg:px-[calc(--spacing(2.5)-1px)]',
					'density-lg:*:data-[slot=loading-spinner]:size-6',
				],
			},
			pill: {
				sm: 'density-sm:px-[calc(--spacing(2)-1px)]',
				md: 'density-md:px-[calc(--spacing(2.5)-1px)]',
				lg: 'density-lg:px-[calc(--spacing(3)-1px)]',
			},
		},
	},
)

/** Recipe variant props for {@link Badge} — the styling axes its kata exposes (`variant`, `color`, `size`, `radius`), for consumers composing custom slots. */
export type BadgeVariants = VariantProps<typeof k>
