import { defineRecipe, iro, ji, narabi, sawari, type VariantPropsOf } from '../../core/recipe'

const label = defineRecipe({
	base: [
		'select-none',
		sawari.cursor,
		'[[data-slot=field][data-disabled]_&]:cursor-not-allowed',
		'[[data-slot=control][data-disabled]_&]:cursor-not-allowed',
		iro.text.default,
		sawari.disabled,
	],
	size: {
		sm: ji.size.sm,
		md: ji.size.md,
		lg: ji.size.lg,
	},
	defaults: { size: 'md' },
})

const description = defineRecipe({
	base: [iro.text.muted, sawari.disabled],
	size: {
		sm: ji.size.sm,
		md: ji.size.md,
		lg: ji.size.lg,
	},
	defaults: { size: 'md' },
})

const message = defineRecipe({
	base: [sawari.disabled],
	size: {
		sm: ji.size.sm,
		md: ji.size.md,
		lg: ji.size.lg,
	},
	variant: {
		error: iro.text.error,
		success: iro.text.success,
	},
	defaults: { size: 'md', variant: 'error' },
})

const legend = defineRecipe({
	base: ['font-semibold', iro.text.default, sawari.disabled],
	size: {
		sm: ji.size.sm,
		md: ji.size.md,
		lg: ji.size.lg,
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['[&>legend+*]:pt-4', sawari.disabled],
	legend,
	field: [
		...narabi.field,
		'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
		'dark:data-disabled:border-white/15',
	],
	label,
	description,
	message,
}

export type FieldsetMessageVariants = VariantPropsOf<typeof message>
