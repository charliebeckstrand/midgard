import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'
import { iro } from '../kiso'

const { input, density, size, resets, surface, affix } = control

export const k = defineRecipe(
	{
		base: [...input, 'block', 'rounded-lg'],
		variant: {
			default: [],
			outline: [],
			glass: [],
		},
		density,
		size,
		slots: {
			affix: [
				'flex items-center min-w-0',
				'*:data-[slot=icon]:pointer-events-none',
				...iro.text.muted,
			],
			number: resets.number,
		},
		defaults: { variant: 'default', density: 'md', size: 'md' },
	},
	{
		inputControl: defineRecipe({
			variant: {
				default: surface.default,
				outline: [],
				glass: surface.glass,
			},
			defaults: { variant: 'default' },
		}),
		/** Density-keyed prefix padding for the input affix slot. */
		prefix: affix.prefix,
		/** Density-keyed suffix padding for the input affix slot. */
		suffix: affix.suffix,
		/** Density-keyed autofill offset compensation. */
		autofill: affix.autofill,
	},
)

export type InputVariants = VariantPropsOf<typeof k>
