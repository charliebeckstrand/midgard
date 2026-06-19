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
	// Period variant: the three labeled toggle groups in the popover and the
	// chip row inside the trigger. Colour comes from the Button/Badge recipes;
	// these are layout-only.
	period: {
		// Flex gap (not space-y): the fieldsets carry an `m-0` reset that would
		// override space-y's margins, collapsing the gap between groups.
		//
		// The popover is content-sized, so the 12 fixed `sm` month toggles would
		// otherwise sprawl onto a single row. Capping the width here is what makes
		// `options`' flex-wrap fold the month group to two rows (six per row); the
		// shorter year/quarter groups still fit. Width-only, so it scopes to the
		// period popover without touching the single/range calendars.
		root: 'flex max-w-72 flex-col gap-4',
		section: 'space-y-1.5',
		label: [text.muted, 'text-xs font-medium uppercase tracking-wide select-none'],
		options: 'flex flex-wrap gap-1.5',
		// A chip stands one badge-step (a constant 4px; the badge and trigger-text
		// ramps step in 4px lockstep) taller than the trigger's text line, so the
		// chip row would otherwise drive the control ~2px taller per side than the
		// placeholder state. The negative block margin lets that overflow bleed into
		// the button's vertical padding (≥6px at every size) instead of growing the
		// box, holding the trigger height steady across states without pinning a
		// min-height. The badge keeps its natural box, so `overflow-hidden`
		// truncation is unaffected.
		chips: 'flex items-center gap-1 min-w-0 -my-0.5',
	},
}
