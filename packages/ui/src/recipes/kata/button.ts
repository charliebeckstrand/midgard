import { definePalette, defineRecipe, merge, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen, shaku, ugoki } from '../kiso'

const { palette } = iro
const { cursor, disabled } = hannou
const { size, weight } = ji
const { gap, padding, radius } = kasane
const { button } = kokkaku
const { flex } = narabi
const { focus } = sen
const { icon } = shaku
const { spring } = ugoki

// Synthetic colour entry: inherits parent text colour with a hover wash on non-disabled elements.
const inherit = ['text-inherit', 'not-disabled:hover:bg-current/15']

const solid = {
	...merge(palette.solid.bg, palette.solid.text, palette.solid.hover),
	inherit,
}
const soft = { ...merge(palette.soft.bg, palette.soft.text, palette.soft.hover), inherit }
const outline = {
	...merge(palette.outline.ring, palette.outline.text, palette.outline.hover),
	inherit,
}
const plain = { ...merge(palette.plain.text, palette.plain.hover), inherit }
const bare = { ...merge(palette.bare.text, palette.bare.hover), inherit }

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
			bare: [
				focus.inset,
				// WCAG 2.5.8 floor: an icon-only bare box (xs 18px) must still hit
				// 24px. The floored border-box is the button's real footprint; a
				// control affix re-aligns the glyph by subtracting the compound `p`
				// from its own padding (see affix-compensation boundary). Labelled
				// bare buttons are excluded; they stay on the size-level `py`.
				'not-data-[has-label]:min-w-6 not-data-[has-label]:min-h-6',
			],
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
		palette: definePalette(
			{
				solid: [palette.solid.bg, palette.solid.text, palette.solid.hover],
				soft: [palette.soft.bg, palette.soft.text, palette.soft.hover],
				outline: [palette.outline.ring, palette.outline.text, palette.outline.hover],
				plain: [palette.plain.text, palette.plain.hover],
				bare: [palette.bare.text, palette.bare.hover],
			},
			{ inherit },
		),
		// Compound variants ensure the palette is correct when a variant and size combo triggers the
		// icon-only bare button floor. The `not-data-[has-label]` selector is repeated here to
		// override the size styles with the floor styles when the button is icon-only, but defer to
		// the size styles when a label is present.
		compound: [
			{
				variant: 'bare',
				size: 'xs',
				class: ['not-data-[has-label]:p-0.75'],
			},
			{
				variant: 'bare',
				size: 'sm',
				class: ['not-data-[has-label]:p-1'],
			},
			{
				variant: 'bare',
				size: 'md',
				class: ['not-data-[has-label]:p-1.25'],
			},
			{
				variant: 'bare',
				size: 'lg',
				class: ['not-data-[has-label]:p-1.5'],
			},
		],
		defaults: { variant: 'solid', color: 'zinc', size: 'md' },
		skeleton: button,
	},
	{
		solid,
		soft,
		outline,
		plain,
		bare,
		motion: spring,
	},
)

export type ButtonVariants = VariantProps<typeof k>
