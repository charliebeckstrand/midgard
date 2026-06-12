import { defineRecipe } from '../../core/recipe'
import { hannou, iro, sen } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { cursor } = hannou
const { focus } = sen
const { text } = iro
const { affix, reset, density, size, surface } = control
const { portal, panel } = popover

const button = defineRecipe({
	base: ['flex items-center justify-between', ...reset, 'text-left', 'appearance-none', ...cursor],
	density,
	size,
	defaults: { density: 'md', size: 'md' },
})

const value = defineRecipe({
	base: 'block',
	truncate: {
		true: 'truncate',
		false: '',
	},
	defaults: { truncate: true },
})

// Portal-only inset around the Calendar plus the Calendar-to-footer gap;
// an inline Calendar carries no chrome of its own, so this lives here,
// not in the calendar kata.
const body = defineRecipe({
	density: {
		sm: ['p-2', 'space-y-1'],
		md: ['p-3', 'space-y-2'],
		lg: ['p-4', 'space-y-3'],
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
	affix: {
		...affix,
		base: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...text.muted],
	},
	content: {
		portal: [focus.ring, ...portal],
		motion: panel.motion,
		text: text.default,
		glass: panel.glass,
		body,
	},
}
