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

// Synthetic colour entry: lets a button skip the palette and inherit
// its parent's text colour, with a hover wash on non-disabled elements.
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
		// focus.inset rides each variant rather than `base` so it never reaches
		// `bare`. Its `outline-none` sets `--tw-outline-style: none`, which would
		// poison bare's outset `focus-visible:outline-*` to `outline-style: none`.
		variant: {
			solid: focus.inset,
			soft: focus.inset,
			outline: ['ring-1 ring-inset', focus.inset],
			plain: focus.inset,
			ghost: focus.inset,
		},
		// Square padding (`p`) keeps icon-only buttons even-sided. When the
		// children carry a text label the component sets `data-has-label`, which
		// overrides `py` to the matching control density step so a labeled button
		// lines up with same-size Input/Select chrome (e.g. md → 38px).
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
				class: [
					'p-0',
					// bare alone skips focus.inset (p-0 leaves no room for an inset
					// ring). With no `outline-none` poisoning `--tw-outline-style`,
					// this outset outline renders cleanly on focus.
					'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
				],
			},
			// Floor the icon-only bare hit box at the WCAG 2.5.8 minimum (24px) as a
			// real, gate-measurable border-box. Absolutely-positioned hit expanders
			// (the TouchTarget sibling, a `::before` overlay) widen the pointer area but
			// are invisible to axe's target-size and to the spec's box metric (see
			// toggle-icon-button.ts), so only a real box satisfies the gate — which is
			// why this box, not slop, carries compliance. A matched negative margin of
			// `(24px − iconbox)/2` per side collapses the box's margin-box back to the
			// icon's footprint, so the floor grows the hit box without growing the row
			// it sits in — the overshoot reaches into the parent's existing padding. Per
			// size: xs/sm/md icons are 12/16/20px; lg's 24px icon already clears the
			// floor, so it needs no rule. Gated to `:not([data-has-label])` so inline
			// text-label bare links keep their natural inline box and lean on WCAG's
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
