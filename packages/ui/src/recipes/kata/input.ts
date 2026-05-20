import { defineRecipe, iro, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'

export const k = defineRecipe({
	base: [...control.field, 'block', 'rounded-lg'],
	variant: {
		default: [],
		outline: [],
		glass: [],
	},
	density: control.density,
	size: control.size,
	slots: {
		affix: [
			'flex items-center min-w-0',
			'*:data-[slot=icon]:pointer-events-none',
			...iro.text.muted,
		],
		number: control.resets.number,
	},
	defaults: { variant: 'default', density: 'md', size: 'md' },
})

export const inputControl = defineRecipe({
	variant: {
		default: control.surface.default,
		outline: [],
		glass: control.surface.glass,
	},
	defaults: { variant: 'default' },
})

/** Density-keyed prefix padding for the input affix slot. */
export const prefix = control.affix.prefix

/** Density-keyed suffix padding for the input affix slot. */
export const suffix = control.affix.suffix

/** Density-keyed autofill offset compensation. */
export const autofill = control.affix.autofill

export type InputVariants = VariantPropsOf<typeof k>
