import {
	defineRecipe,
	hannou,
	iro,
	ji,
	merge,
	palette,
	sen,
	shaku,
	tsunagi,
	type VariantPropsOf,
} from '../../core/recipe'

const { solid, soft, outline, plain, bare } = iro.palette
const { inherit } = iro.text

// Pre-merged variant × colour bundles — kept as named exports for cross-kata
// consumers (e.g. calendar reads `buttonSoft.blue` for selected-cell colour).
export const buttonSolid = { ...merge(solid.bg, solid.text, solid.hover), inherit }
export const buttonSoft = { ...merge(soft.bg, soft.text, soft.hover), inherit }
export const buttonOutline = { ...merge(outline.ring, outline.text, outline.hover), inherit }
export const buttonPlain = { ...merge(plain.text, plain.hover), inherit }
export const buttonBare = { ...merge(bare.text, bare.hover), inherit }
export const buttonGhost = { ...plain.text, inherit }

export const k = defineRecipe({
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
		glass: '',
	},
	size: {
		xs: [
			ji.size.xs,
			shaku.icon.xs,
			'gap-0.5',
			'p-[calc(--spacing(1.5)-1px)]',
			'data-[has-label]:py-[calc(--spacing(1)-1px)]',
		],
		sm: [
			ji.size.sm,
			shaku.icon.sm,
			'gap-0.75',
			'p-[calc(--spacing(2)-1px)]',
			'data-[has-label]:py-[calc(--spacing(1.5)-1px)]',
		],
		md: [
			ji.size.md,
			shaku.icon.md,
			'gap-xs',
			'p-[calc(--spacing(2.5)-1px)]',
			'data-[has-label]:py-[calc(--spacing(2)-1px)]',
		],
		lg: [
			ji.size.lg,
			shaku.icon.lg,
			'gap-sm',
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
})

export type ButtonVariants = VariantPropsOf<typeof k>
