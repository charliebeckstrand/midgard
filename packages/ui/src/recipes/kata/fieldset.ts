import { tv } from 'tailwind-variants'
import { iro, ji, narabi, sawari } from '../../core/recipe'

const label = tv({
	base: [
		'select-none',
		sawari.cursor,
		'[[data-slot=field][data-disabled]_&]:cursor-not-allowed',
		'[[data-slot=control][data-disabled]_&]:cursor-not-allowed',
		iro.text.default,
		sawari.disabled,
	],
	variants: {
		size: {
			sm: ji.size.sm,
			md: ji.size.md,
			lg: ji.size.lg,
		},
	},
	defaultVariants: { size: 'md' },
})

const description = tv({
	base: [iro.text.muted, sawari.disabled],
	variants: {
		size: {
			sm: ji.size.sm,
			md: ji.size.md,
			lg: ji.size.lg,
		},
	},
	defaultVariants: { size: 'md' },
})

const message = tv({
	base: [sawari.disabled],
	variants: {
		size: {
			sm: ji.size.sm,
			md: ji.size.md,
			lg: ji.size.lg,
		},
		variant: {
			error: iro.text.error,
			success: iro.text.success,
		},
	},
	defaultVariants: { size: 'md', variant: 'error' },
})

const legend = tv({
	base: ['font-semibold', iro.text.default, sawari.disabled],
	variants: {
		size: {
			sm: ji.size.sm,
			md: ji.size.md,
			lg: ji.size.lg,
		},
	},
	defaultVariants: { size: 'md' },
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

export { message as messageVariants }
