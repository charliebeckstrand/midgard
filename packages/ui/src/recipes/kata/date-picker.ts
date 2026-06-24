/**
 * Date-picker kata: object-literal surface for the `<DatePicker>` trigger and
 * its popover. Density-/size-axed `button` and `body` sub-recipes drive the
 * control and popover insets; `surface`, `value`, `control` (the input-mode
 * field adjacency), `icon`, `placeholder`, `affix`, and the `content` group are
 * slots, and `relative` adds the relative popover's layout-only preset list,
 * custom-range affordance, and trigger chip row.
 */
import { defineRecipe } from '../../core/recipe'
import { hannou, iro, narabi, sen } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { cursor } = hannou
const { focus } = sen
const { text } = iro
const { affix, reset, density, size, surface } = control
const { field } = narabi
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
	// Input mode wraps the DateInput — its frame plus the error Message — in the
	// floating reference, so the Field's child-combinator adjacency can't reach
	// the nested message. Reuse that same adjacency here to space the message
	// from the input exactly as a <Field> would.
	control: field,
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
	// Relative variant: the preset list and custom-range affordance in the
	// popover, plus the chip row inside the trigger. Colour comes from the
	// Button/Badge recipes; these are layout-only.
	relative: {
		// A narrow, single-column stack of full-width preset rows; `min-w` gives
		// the list a stable width independent of label length. Width-scoped here so
		// it never touches the single/range calendars.
		root: 'flex min-w-52 flex-col gap-0.5',
		// Preset rows read as a left-aligned menu rather than centered chips.
		preset: 'w-full justify-start',
		// The custom row trails the presets: label left, chevron right.
		custom: 'w-full justify-between',
		// Calendar mode: the back affordance above the CalendarRange.
		calendar: 'space-y-2',
		back: 'justify-start gap-1',
		// A chip stands a hair taller than the trigger's text line, so the chip row
		// would otherwise drive the control ~1px taller per side than the placeholder
		// state. The negative block margin lets that overflow bleed into the button's
		// vertical padding (≥6px at every size) instead of growing the box, holding
		// the trigger height steady across states without pinning a min-height. The
		// badge keeps its natural box, so `overflow-hidden` truncation is unaffected.
		chips: 'flex items-center gap-1 min-w-0 -my-px',
	},
}
