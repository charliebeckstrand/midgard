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
const ghost = { ...palette.plain.text, inherit }

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
		// Focus treatment per variant. Filled and transparent variants use the
		// universal offset ring; `outline` and `bare` use an inset ring, sharing
		// Tailwind's ring-inset channel with the outline's own border.
		variant: {
			solid: focus.ring,
			soft: focus.ring,
			plain: focus.ring,
			ghost: focus.ring,
			outline: ['ring-1 ring-inset', ...focus.inset],
			bare: focus.inset,
		},
		// Square padding (`p`) keeps icon-only buttons even-sided. When a text label
		// is present the component sets `data-has-label`, which overrides `py` to
		// the matching control density step — aligning a labeled button with
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
				ghost: palette.plain.text,
			},
			{ inherit },
		),
		compound: [
			{
				variant: 'bare',
				class: 'p-0',
			},
			// Floors the icon-only bare hit box at the WCAG 2.5.8 minimum (24×24px)
			// as a real border-box. A matched negative margin of `(24px − iconbox)/2`
			// collapses the margin-box back to the icon's footprint, so the floor
			// grows the hit area without growing the row. xs/sm/md icons are
			// 12/16/20px; lg's 24px icon already meets the floor. Gated to
			// `:not([data-has-label])` so inline bare links use WCAG's
			// inline-target exception instead.
			{
				variant: 'bare',
				size: 'xs',
				class:
					'not-data-[has-label]:min-w-6 not-data-[has-label]:min-h-6 not-data-[has-label]:-m-1.5',
			},
			{
				variant: 'bare',
				size: 'sm',
				class:
					'not-data-[has-label]:min-w-6 not-data-[has-label]:min-h-6 not-data-[has-label]:-m-1',
			},
			{
				variant: 'bare',
				size: 'md',
				class:
					'not-data-[has-label]:min-w-6 not-data-[has-label]:min-h-6 not-data-[has-label]:-m-0.5',
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
		ghost,
		motion: spring,
	},
)

export type ButtonVariants = VariantProps<typeof k>
