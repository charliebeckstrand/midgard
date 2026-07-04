import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen, shaku, ugoki } from '../kiso'

const { extendedPalette } = iro
const { cursor, disabled } = hannou
const { size, weight } = ji
const { gap, padding, radius } = kasane
const { button } = kokkaku
const { flex } = narabi
const { focus } = sen
const { icon } = shaku
const { spring } = ugoki

export const k = defineRecipe(
	{
		base: [
			'relative isolate',
			'touch-manipulation',
			flex.inline,
			'justify-center',
			'w-fit shrink-0',
			weight.semibold,
			...disabled,
			...cursor,
		],
		variant: {
			solid: focus.ring,
			soft: focus.inset,
			outline: ['ring-1 ring-inset', focus.inset],
			plain: focus.inset,
			bare: focus.inset,
		},
		// Square padding (`p`) keeps icon-only buttons even-sided. When a text label
		// is present the component sets `data-has-label`, which overrides `py` to
		// the matching control density step, aligning a labeled button with
		// same-size Input/Select chrome (e.g. md → 38px).
		size: {
			xs: [
				size.xs,
				icon.xs,
				gap.g('0.75'),
				padding.p('1.5'),
				radius.r('1'),
				'data-[has-label]:py-[calc(--spacing(1)-1px)]',
			],
			sm: [
				size.sm,
				icon.sm,
				gap.g('1'),
				padding.p('2'),
				radius.r('1.5'),
				'data-[has-label]:py-[calc(--spacing(1.5)-1px)]',
			],
			md: [
				size.md,
				icon.md,
				gap.g('1.25'),
				padding.p('2.5'),
				radius.r('2'),
				'data-[has-label]:py-[calc(--spacing(2)-1px)]',
			],
			lg: [
				size.lg,
				icon.lg,
				gap.g('1.5'),
				padding.p('3'),
				radius.r('2.5'),
				'data-[has-label]:py-[calc(--spacing(2.5)-1px)]',
			],
		},
		// Opt into the wide palette: Button's `color` axis carries the standard set
		// plus the extended hues (rose / violet / sky), matching Badge.
		palette: definePalette(
			{
				solid: [extendedPalette.solid.bg, extendedPalette.solid.text, extendedPalette.solid.hover],
				soft: [extendedPalette.soft.bg, extendedPalette.soft.text, extendedPalette.soft.hover],
				outline: [
					extendedPalette.outline.ring,
					extendedPalette.outline.text,
					extendedPalette.outline.hover,
				],
				plain: [extendedPalette.plain.text, extendedPalette.plain.hover],
				bare: [extendedPalette.bare.text, extendedPalette.bare.hover],
			},
			// Synthetic colour entry: inherits parent text colour with a hover wash on non-disabled elements.
			{ inherit: ['text-inherit', 'not-disabled:hover:bg-current/15'] },
		),
		// Icon-only floor: a square pad per size keeps an icon-only bare button
		// even-sided; `not-data-[has-label]` yields to the size axis's padding once
		// a label is present.
		compound: [
			{ variant: 'bare', size: 'xs', class: ['not-data-[has-label]:p-0.75'] },
			{ variant: 'bare', size: 'sm', class: ['not-data-[has-label]:p-1'] },
			{ variant: 'bare', size: 'md', class: ['not-data-[has-label]:p-1.25'] },
			{ variant: 'bare', size: 'lg', class: ['not-data-[has-label]:p-1.5'] },
		],
		defaults: { variant: 'solid', color: 'zinc', size: 'md' },
		skeleton: button,
	},
	{
		motion: spring,
	},
)

/** Recipe variant props for {@link Button} — the styling axes its kata exposes (`variant`, `color`, `size`), for consumers composing custom slots. */
export type ButtonVariants = VariantProps<typeof k>
