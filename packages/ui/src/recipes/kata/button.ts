import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
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

// Icon-only "floor" padding per size for the bare variant (a square pad keeps
// an icon-only button even-sided). `not-data-[has-label]` defers to the size
// axis's padding when a label is present. Literals so Tailwind scans them.
const bareFloor = {
	xs: 'not-data-[has-label]:p-0.75',
	sm: 'not-data-[has-label]:p-1',
	md: 'not-data-[has-label]:p-1.25',
	lg: 'not-data-[has-label]:p-1.5',
} as const

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
		palette: definePalette(
			{
				solid: [palette.solid.bg, palette.solid.text, palette.solid.hover],
				soft: [palette.soft.bg, palette.soft.text, palette.soft.hover],
				outline: [palette.outline.ring, palette.outline.text, palette.outline.hover],
				plain: [palette.plain.text, palette.plain.hover],
				bare: [palette.bare.text, palette.bare.hover],
			},
			// Synthetic colour entry: inherits parent text colour with a hover wash on non-disabled elements.
			{ inherit: ['text-inherit', 'not-disabled:hover:bg-current/15'] },
		),
		// Compound variants apply the icon-only bare floor: with no label, override
		// the size padding with the square floor; with a label present,
		// `not-data-[has-label]` defers to the size axis.
		compound: (['xs', 'sm', 'md', 'lg'] as const).map((size) => ({
			variant: 'bare' as const,
			size,
			class: [bareFloor[size]],
		})),
		defaults: { variant: 'solid', color: 'zinc', size: 'md' },
		skeleton: button,
	},
	{
		motion: spring,
	},
)

/** Recipe variant props for {@link Button} — the styling axes its kata exposes (`variant`, `color`, `size`), for consumers composing custom slots. */
export type ButtonVariants = VariantProps<typeof k>
