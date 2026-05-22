import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'
import { kokkaku, sen } from '../kiso'

const { input, density, size, surface } = control

const textareaControl = defineRecipe({
	variant: {
		default: surface.default,
		outline: [],
		glass: surface.glass,
	},
	defaults: { variant: 'default' },
})

export const k = defineRecipe(
	{
		base: ['block', ...input, 'rounded-lg', 'min-h-10'],
		variant: {
			default: [],
			outline: [],
			glass: [],
		},
		density,
		size,
		resize: {
			none: 'resize-none',
			vertical: 'resize-y',
			horizontal: 'resize-x',
		},
		autoResize: { true: 'field-sizing-content', false: '' },
		slots: {
			/** Strips textarea chrome when nested inside a framed container. */
			bare: ['border-0', 'rounded-none', 'focus:outline-hidden'],
			/** ControlFrame border when an actions slot is present. */
			frame: [...sen.border],
			/** Actions row beneath the textarea. */
			actions: 'flex items-center mt-auto gap-2 pr-2 pb-2',
		},
		defaults: {
			variant: 'default',
			density: 'md',
			size: 'md',
			resize: 'none',
			autoResize: false,
		},
	},
	{
		textareaControl,
		skeleton: kokkaku.textarea,
	},
)

export type TextareaVariants = VariantPropsOf<typeof k>
