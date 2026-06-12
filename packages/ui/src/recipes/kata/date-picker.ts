import { defineRecipe } from '../../core/recipe'
import { hannou, iro } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { cursor } = hannou
const { text } = iro
const { reset, density, size, surface } = control
const { portal, panel } = popover

const button = defineRecipe({
	base: ['flex items-center justify-between', ...reset, 'text-left', 'appearance-none', ...cursor],
	density,
	size,
	defaults: { density: 'md', size: 'md' },
})

const value = defineRecipe({
	base: ['block'],
	truncate: {
		true: 'truncate',
		false: '',
	},
	defaults: { truncate: true },
})

// Portal-only inset around the Calendar and below the footer; an inline
// Calendar carries no chrome of its own, so this lives here, not in the
// calendar kata.
const body = defineRecipe({
	density: {
		sm: 'p-2',
		md: 'p-3',
		lg: 'p-4',
	},
	defaults: { density: 'md' },
})

export const k = {
	surface: {
		default: surface.default,
		glass: [],
	},
	button,
	value,
	icon: ['flex items-center', 'pointer-events-none', text.muted],
	placeholder: text.muted,
	content: {
		portal,
		motion: panel.motion,
		text: text.default,
		glass: panel.glass,
		body,
	},
}
