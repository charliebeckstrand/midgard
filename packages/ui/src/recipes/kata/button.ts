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
			focus.inset,
			...disabled,
			...cursor,
		],
		variant: {
			// `focus.inset` (in `base`) paints `ring-blue-600` onto a same-token
			// `bg-blue-600` fill (and equivalents), so the ring vanishes into the
			// fill. `ring-current` retints it to the foreground — white on
			// zinc/red/green/blue, amber-950 on amber — which the contrast suite
			// already proves clears AA against each fill (tailwind-merge, base →
			// variant, lets it supersede the blue). The inset offset width then
			// floats that ring a step inside the fill (colour comes from the
			// per-colour `solid.ringOffset` on the palette) so it reads as a focus
			// halo, not a flush border, without ever leaving the box.
			solid: ['focus-visible:ring-current', 'focus-visible:ring-offset-2'],
			outline: 'ring-1 ring-inset',
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
				solid: [
					palette.solid.bg,
					palette.solid.text,
					palette.solid.hover,
					palette.solid.ringOffset,
				],
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
			// Floor the icon-only bare hit box at the WCAG 2.5.8 minimum (24px) as a
			// real, gate-measurable border-box. The `::before` slop above widens the
			// pointer area but is invisible to axe's target-size and to the spec's box
			// metric (see toggle-icon-button.ts), so only a real box satisfies the
			// gate. A matched negative margin of `(24px − iconbox)/2` per side collapses
			// the box's margin-box back to the icon's footprint, so the floor grows the
			// hit box without growing the row it sits in — the overshoot reaches into
			// the parent's existing padding. Per size: xs/sm/md icons are 12/16/20px;
			// lg's 24px icon already clears the floor, so it needs no rule. Gated to
			// `:not([data-has-label])` so inline text-label bare links keep their
			// natural inline box and lean on WCAG's inline-target exception instead.
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
