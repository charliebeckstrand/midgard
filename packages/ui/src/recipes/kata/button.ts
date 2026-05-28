import { definePalette, defineRecipe, merge, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen, shaku, tsunagi, ugoki } from '../kiso'

const { palette } = iro
const { cursor, disabled } = hannou
const { size, weight } = ji
const { gap, padding, radius } = kasane
const { button } = kokkaku
const { flex } = narabi
const { focus } = sen
const { icon } = shaku
const { base } = tsunagi
const { spring } = ugoki

// Synthetic colour entry: lets a button skip the palette and inherit
// its parent's text colour, with a hover wash on non-disabled elements.
const inherit = ['text-inherit', 'not-disabled:hover:bg-current/15']

const solidBundle = {
	...merge(palette.solid.bg, palette.solid.text, palette.solid.hover),
	inherit,
}
const softBundle = { ...merge(palette.soft.bg, palette.soft.text, palette.soft.hover), inherit }
const outlineBundle = {
	...merge(palette.outline.ring, palette.outline.text, palette.outline.hover),
	inherit,
}
const plainBundle = { ...merge(palette.plain.text, palette.plain.hover), inherit }
const bareBundle = { ...merge(palette.bare.text, palette.bare.hover), inherit }
const ghostBundle = { ...palette.plain.text, inherit }

export const k = defineRecipe(
	{
		base: [
			'relative isolate',
			flex.inline,
			'justify-center',
			'w-fit shrink-0',
			weight.semibold,
			focus.inset,
			...disabled,
			...cursor,
			...base,
		],
		variant: {
			outline: 'ring-1 ring-inset',
		},
		size: {
			xs: [
				size.xs,
				icon.xs,
				gap.g('0.5'),
				padding.p('1.5'),
				radius.r('1'),
				'data-[has-label]:py-[calc(--spacing(1)-1px)]',
			],
			sm: [
				size.sm,
				icon.sm,
				gap.g('0.75'),
				padding.p('2'),
				radius.r('1.5'),
				'data-[has-label]:py-[calc(--spacing(1.5)-1px)]',
			],
			md: [
				size.md,
				icon.md,
				gap.g('1'),
				padding.p('2.5'),
				radius.r('2'),
				'data-[has-label]:py-[calc(--spacing(2)-1px)]',
			],
			lg: [
				size.lg,
				icon.lg,
				gap.g('1.25'),
				padding.p('3'),
				radius.r('2.5'),
				'data-[has-label]:py-[calc(--spacing(2.5)-1px)]',
			],
		},
		palette: definePalette(
			{
				solid: [palette.solid.bg, palette.solid.text, palette.solid.hover],
				soft: [palette.soft.bg, palette.soft.text, palette.soft.hover],
				outline: [palette.outline.ring, palette.outline.text, palette.outline.hover],
				plain: [palette.plain.text, palette.plain.hover],
				bare: [palette.bare.text, palette.bare.hover],
				ghost: palette.plain.text,
			},
			{ inherit },
		),
		compound: [
			{
				variant: 'bare',
				class: ['p-0', 'before:content-[""] before:absolute before:-inset-2'],
			},
		],
		defaults: { variant: 'solid', color: 'zinc', size: 'md' },
		skeleton: button,
	},
	{
		solid: solidBundle,
		soft: softBundle,
		outline: outlineBundle,
		plain: plainBundle,
		bare: bareBundle,
		ghost: ghostBundle,
		motion: spring,
	},
)

export type ButtonVariants = VariantProps<typeof k>
