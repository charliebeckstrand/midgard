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
		// universal offset ring; `outline` uses an inset ring, sharing Tailwind's
		// ring-inset channel with its own border.
		//
		// `bare` strips horizontal padding (and all of it when icon-only), so a
		// ring on its own box would hug the glyphs. Instead it paints the offset ring on an `::after` phantom box,
		// inflated by the per-size compound rules below to the footprint this
		// control would occupy *with* `plain`'s padding. The pseudo is out of
		// flow and `pointer-events-none`, so the indicator reads identically to
		// `plain` without reserving any layout space — surrounding content never
		// shifts.
		variant: {
			solid: focus.ring,
			soft: focus.ring,
			plain: focus.ring,
			ghost: focus.ring,
			outline: ['ring-1 ring-inset', ...focus.inset],
			bare: [
				'outline-none',
				'after:absolute after:pointer-events-none',
				'focus-visible:after:outline-2 focus-visible:after:outline-offset-2',
				'focus-visible:after:outline-blue-600 dark:focus-visible:after:outline-blue-500',
			],
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
			// Phantom focus-ring geometry. Inflate the `::after` box to the
			// footprint `plain` would occupy at this size, carrying `plain`'s
			// radius. Horizontal `p` is added in every state — `p-0` zeroes
			// bare's x-padding outright. Vertical `p` is added only icon-only:
			// the size's `data-has-label` `py` override outlives `p-0`, so a
			// labelled bare button already carries `plain`'s exact vertical
			// padding, and `inset-y-0` leaves that axis untouched. Negative inset
			// grows the pseudo outward only; the outline's `outline-offset-2` then
			// lands the stroke exactly where `focus.ring` puts `plain`'s.
			{
				variant: 'bare',
				size: 'xs',
				class: [
					'after:inset-x-[calc((--spacing(1.5)-1px)*-1)]',
					'after:inset-y-[calc((--spacing(1.5)-1px)*-1)]',
					'data-[has-label]:after:inset-y-0',
					'after:rounded-[--spacing(1)]',
				],
			},
			{
				variant: 'bare',
				size: 'sm',
				class: [
					'after:inset-x-[calc((--spacing(2)-1px)*-1)]',
					'after:inset-y-[calc((--spacing(2)-1px)*-1)]',
					'data-[has-label]:after:inset-y-0',
					'after:rounded-[--spacing(1.5)]',
				],
			},
			{
				variant: 'bare',
				size: 'md',
				class: [
					'after:inset-x-[calc((--spacing(2.5)-1px)*-1)]',
					'after:inset-y-[calc((--spacing(2.5)-1px)*-1)]',
					'data-[has-label]:after:inset-y-0',
					'after:rounded-[--spacing(2)]',
				],
			},
			{
				variant: 'bare',
				size: 'lg',
				class: [
					'after:inset-x-[calc((--spacing(3)-1px)*-1)]',
					'after:inset-y-[calc((--spacing(3)-1px)*-1)]',
					'data-[has-label]:after:inset-y-0',
					'after:rounded-[--spacing(2.5)]',
				],
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
