import { defineRecipe, iro, ji, palette, type VariantPropsOf } from '..'

const { solid, soft, outline, plain } = iro.palette

export const k = defineRecipe({
	base: ['group', 'inline-flex w-fit items-center', 'font-medium'],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	size: {
		xs: [
			'px-1 py-0.25',
			'gap-0.5',
			ji.size.xs,
			'data-[has-prefix]:has-[button]:pr-2',
			'data-[has-suffix]:has-[button]:pl-2',
		],
		sm: [
			'px-1.5 py-0.5',
			'gap-1',
			ji.size.sm,
			'data-[has-prefix]:has-[button]:pr-2.5',
			'data-[has-suffix]:has-[button]:pl-2.5',
		],
		md: [
			'px-2 py-1',
			'gap-1.5',
			ji.size.md,
			'data-[has-prefix]:has-[button]:pr-3',
			'data-[has-suffix]:has-[button]:pl-3',
		],
		lg: [
			'px-2.5 py-1.5',
			'gap-2',
			ji.size.lg,
			'data-[has-prefix]:has-[button]:pr-3.5',
			'data-[has-suffix]:has-[button]:pl-3.5',
		],
	},
	rounded: {
		none: 'rounded-none',
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		xl: 'rounded-xl',
		full: 'rounded-full',
	},
	palette: palette({
		solid: [solid.bg, solid.text],
		soft: [soft.bg, soft.text],
		outline: [outline.ring, outline.text],
		plain: plain.text,
	}),
	defaults: { variant: 'soft', color: 'zinc', size: 'md', rounded: 'md' },
})

export type BadgeVariants = VariantPropsOf<typeof k>
