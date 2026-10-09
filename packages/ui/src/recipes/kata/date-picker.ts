/**
 * Date-picker kata: object-literal surface for the `<DatePicker>` trigger and
 * its popover. A stepped `button`, a stepped `content.body`, and a `value`
 * sub-recipe with a truncate axis drive the control, the popover inset, and the
 * value text. `surface`, `control` (the input-mode field adjacency), `icon`,
 * `placeholder`, `affix`, and the `content` group are slots.
 * `relative` adds the layout of the relative popover: the preset `list`, the
 * `custom` range affordance, and the trigger chip row. `root` sizes the box of
 * the trigger to its content, and `skeleton` is the form of DatePickerSkeleton.
 */
import { defineRecipe } from '../../core/recipe'
import { hannou, iro, kokkaku, narabi, sen } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'
import { popover } from '../kiso/popover'

const { cursor } = hannou
const { focus } = sen
const { text } = iro
const { affix, reset, density, surface } = control
const { field, flex } = narabi
const { portal, panel, fit } = popover

const button = defineRecipe({
	base: [
		flex.row,
		'justify-between',
		...reset.base,
		'text-start',
		'appearance-none',
		...cursor,
		...density,
		// The calendar icon is inside the button, not in a suffix slot. This gap
		// keeps it the control `px` from the value, as the Listbox chevron is.
		dan.gap.datePicker,
	],
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
// not in the calendar kata. Each takes the step of the nearest density scope.
// The body scrolls when the floating layer caps the height of the panel.
const body = [flex.col, dan.space.box.base, dan.gap.y.sm, fit.scroll]

/**
 * The box of the trigger. It is as wide as the date and the calendar icon. It
 * does not fill its parent, and it does not get wider than its parent.
 */
const root = ['w-fit', 'max-w-full']

export const k = {
	root,
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
	icon: [flex.row, 'pointer-events-none', text.muted],
	placeholder: text.muted,
	skeleton: kokkaku.datePicker,
	affix: {
		base: affix.base,
		suffix: affix.suffix,
	},
	content: {
		// `portal` is a single class string — include it, don't spread it (spreading
		// a string scatters it into junk chars, dropping the z-index and letting the
		// calendar fall behind a modal overlay's backdrop).
		portal: [focus.ring, portal, fit.wrapper],
		motion: panel.motion,
		column: fit.column,
		text: text.default,
		glass: panel.glass,
		body,
	},
	// Relative variant: the preset list and custom-range affordance in the
	// popover, plus the chip row inside the trigger. Color comes from the
	// Button/Badge recipes; these are layout-only.
	relative: {
		// A two-column grid filled column-major (`grid-flow-col`): the component
		// pins the row count so the leading presets stack down the first column and
		// the rest, trailed by the custom-range row, fill the second. `min-w` gives
		// the grid a stable floor independent of label length. Width-scoped here so
		// it never touches the single/range calendars.
		list: `grid grid-flow-col ${dan.gap.scale.sm} min-w-52`,
		// Preset rows read as a left-aligned menu rather than centered chips.
		preset: 'w-full justify-start',
		// The custom-range affordance in the second column, trailing the presets.
		custom: {
			// The row itself: label left, chevron right.
			row: 'w-full justify-between',
			// Custom mode: the back affordance above the stacked Start/End inputs.
			panel: [flex.col, dan.gap.scale.md],
			// The back affordance of custom mode, which returns to the preset list.
			back: `justify-start ${dan.gap.scale.xs}`,
		},
		// The trigger chip row wraps the chips (each `shrink-0`, see the view) onto
		// new lines rather than scrolling or shrinking them; the gap doubles as the
		// inter-row spacing. The button's `py` is one density step below its `px`
		// (tuned for a text line, not a taller chip), so the row adds `py-1` — that
		// constant one-step (4px) gap at every size — to even the inset all around
		// the chips. No height pin: the trigger grows to fit the rows, like
		// TagInput's tag row.
		chips: `flex flex-wrap items-center ${dan.gap.scale.xs} min-w-0 py-1`,
	},
}

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
