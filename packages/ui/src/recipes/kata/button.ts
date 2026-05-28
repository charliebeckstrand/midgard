import { defineRecipe, merge, palette, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen, shaku, tsunagi, ugoki } from '../kiso'

const { solid, soft, outline, plain, bare } = iro.palette

// Synthetic colour entry: lets a button skip the palette and inherit
// its parent's text colour, with a hover wash on non-disabled elements.
const inherit = ['text-inherit', 'not-disabled:hover:bg-current/15']

const solidBundle = { ...merge(solid.bg, solid.text, solid.hover), inherit }
const softBundle = { ...merge(soft.bg, soft.text, soft.hover), inherit }
const outlineBundle = { ...merge(outline.ring, outline.text, outline.hover), inherit }
const plainBundle = { ...merge(plain.text, plain.hover), inherit }
const bareBundle = { ...merge(bare.text, bare.hover), inherit }
const ghostBundle = { ...plain.text, inherit }

export const k = defineRecipe(
	{
		base: [
			'relative isolate',
			narabi.inlineRow,
			'justify-center',
			'w-fit shrink-0',
			ji.weight.semibold,
			sen.focus.inset,
			...hannou.disabled,
			...hannou.cursor,
			...tsunagi.base,
		],
		variant: {
			outline: 'ring-1 ring-inset',
		},
		size: {
			xs: [
				ji.size.xs,
				shaku.icon.xs,
				kasane.g('0.5'),
				kasane.p('1.5'),
				kasane.r('1'),
				'data-[has-label]:py-[calc(--spacing(1)-1px)]',
			],
			sm: [
				ji.size.sm,
				shaku.icon.sm,
				kasane.g('0.75'),
				kasane.p('2'),
				kasane.r('1.5'),
				'data-[has-label]:py-[calc(--spacing(1.5)-1px)]',
			],
			md: [
				ji.size.md,
				shaku.icon.md,
				kasane.g('1'),
				kasane.p('2.5'),
				kasane.r('2'),
				'data-[has-label]:py-[calc(--spacing(2)-1px)]',
			],
			lg: [
				ji.size.lg,
				shaku.icon.lg,
				kasane.g('1.25'),
				kasane.p('3'),
				kasane.r('2.5'),
				'data-[has-label]:py-[calc(--spacing(2.5)-1px)]',
			],
		},
		palette: palette(
			{
				solid: [solid.bg, solid.text, solid.hover],
				soft: [soft.bg, soft.text, soft.hover],
				outline: [outline.ring, outline.text, outline.hover],
				plain: [plain.text, plain.hover],
				bare: [bare.text, bare.hover],
				ghost: plain.text,
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
		skeleton: kokkaku.button,
	},
	{
		solid: solidBundle,
		soft: softBundle,
		outline: outlineBundle,
		plain: plainBundle,
		bare: bareBundle,
		ghost: ghostBundle,
		motion: ugoki.spring,
	},
)

export type ButtonVariants = VariantProps<typeof k>
