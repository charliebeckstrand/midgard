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
		// `portal` is the single `z-100` class string — include it, don't spread it
		// (spreading a string scatters it into junk chars, dropping the z-index and
		// letting the calendar fall behind a modal overlay's z-99 backdrop).
		portal: [focus.ring, portal],
		motion: panel.motion,
		text: text.default,
		glass: panel.glass,
		body,
	},
	// Relative variant: the preset list and custom-range affordance in the
	// popover, plus the chip row inside the trigger. Colour comes from the
	// Button/Badge recipes; these are layout-only.
	relative: {
		// A two-column grid filled column-major (`grid-flow-col`): the component
		// pins the row count so the leading presets stack down the first column and
		// the rest, trailed by the custom-range row, fill the second. `min-w` gives
		// the grid a stable floor independent of label length. Width-scoped here so
		// it never touches the single/range calendars.
		root: 'grid grid-flow-col gap-2 min-w-52',
		// Preset rows read as a left-aligned menu rather than centered chips.
		preset: 'w-full justify-start',
		// The custom-range affordance in the second column, trailing the presets.
		custom: {
			// The row itself: label left, chevron right.
			row: 'w-full justify-between',
			// Custom mode: the back affordance above the stacked Start/End inputs.
			panel: 'flex flex-col gap-3',
		},
		back: 'justify-start gap-1',
		// The trigger chip row wraps the chips (each `shrink-0`, see the view) onto
		// new lines rather than scrolling or shrinking them; the gap doubles as the
		// inter-row spacing. The button's `py` is one density step below its `px`
		// (tuned for a text line, not a taller chip), so the row adds `py-1` — that
		// constant one-step (4px) gap at every size — to even the inset all around
		// the chips. No height pin: the trigger grows to fit the rows, like
		// TagInput's tag row.
		chips: 'flex flex-wrap items-center gap-1 min-w-0 py-1',
	},
}
