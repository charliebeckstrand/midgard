import { defineRecipe, merge, palette, type VariantPropsOf } from '../../core/recipe'
import { hannou, iro, ji, kokkaku, sen, shaku, tsunagi, ugoki } from '../kiso'

const { solid, soft, outline, plain, bare } = iro.palette
const { inherit } = iro.text

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
			'inline-flex items-center justify-center',
			'w-fit shrink-0 font-semibold rounded-lg',
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
				ji.xs,
				shaku.icon.xs,
				'gap-0.5',
				'p-[calc(--spacing(1.5)-1px)]',
				'data-[has-label]:py-[calc(--spacing(1)-1px)]',
			],
			sm: [
				ji.sm,
				shaku.icon.sm,
				'gap-0.75',
				'p-[calc(--spacing(2)-1px)]',
				'data-[has-label]:py-[calc(--spacing(1.5)-1px)]',
			],
			md: [
				ji.md,
				shaku.icon.md,
				'gap-1',
				'p-[calc(--spacing(2.5)-1px)]',
				'data-[has-label]:py-[calc(--spacing(2)-1px)]',
			],
			lg: [
				ji.lg,
				shaku.icon.lg,
				'gap-2',
				'p-[calc(--spacing(3)-1px)]',
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
	},
	{
		solid: solidBundle,
		soft: softBundle,
		outline: outlineBundle,
		plain: plainBundle,
		bare: bareBundle,
		ghost: ghostBundle,
		motion: ugoki.spring,
		skeleton: kokkaku.button,
	},
)

export type ButtonVariants = VariantPropsOf<typeof k>
