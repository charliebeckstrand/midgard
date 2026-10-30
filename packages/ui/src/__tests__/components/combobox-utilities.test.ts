import { describe, expect, it, vi } from 'vitest'
import {
	enterKeepsSelection,
	resolveInputDisplay,
	resolveInputTitle,
	selectSoleOption,
} from '../../components/combobox/combobox-utilities'
import { intlEn } from '../../primitives/intl/intl-catalog'

/** The arguments of `resolveInputDisplay` apart from `intl`, which each case shares. */
type DisplayArgs = Omit<Parameters<typeof resolveInputDisplay<unknown>>[0], 'intl'>

/** The arguments of `resolveInputTitle`. */
type TitleArgs = Parameters<typeof resolveInputTitle<unknown>>[0]

const display = (v: unknown) => v as string

/** Adds an option to `container`, with each attribute in `attributes` set. */
function optionIn(container: HTMLElement, ...attributes: string[]): HTMLElement {
	const option = document.createElement('div')

	option.setAttribute('role', 'option')

	for (const attribute of attributes) option.setAttribute(attribute, '')

	container.appendChild(option)

	return option
}

describe('resolveInputDisplay', () => {
	it.for<{ name: string; args: DisplayArgs; expected: string }>([
		{
			name: 'returns the query while the user is editing',
			args: {
				editing: true,
				query: 'partial',
				value: 'real',
				displayValue: display,
				multiple: false,
			},
			expected: 'partial',
		},
		{
			name: 'returns the displayed value when not editing in single-select mode',
			args: {
				editing: false,
				query: '',
				value: { id: 1, name: 'Alice' },
				displayValue: (v) => (v as { name: string }).name,
				multiple: false,
			},
			expected: 'Alice',
		},
		// The threshold stays the control's (a text input whose content scrolls has to stop listing
		// somewhere) while the noun is the caller's. "2 selected" beside a label reading "Postal
		// codes" is fine; in a row of six filters it says how many of nothing in particular.
		{
			name: 'lets the caller name what it is counting',
			args: {
				editing: false,
				query: '',
				value: ['12345', '84045'],
				displayValue: display,
				summarize: (codes) => `${codes.length} postal codes`,
				multiple: true,
			},
			expected: '2 postal codes',
		},
		// One item, so only the missing displayValue sends the selection to the summary.
		{
			name: 'summarizes with no displayValue too, which is the case that can only count',
			args: {
				editing: false,
				query: '',
				value: ['a'],
				summarize: (items) => `${items.length} things`,
				multiple: true,
			},
			expected: '1 things',
		},
		// The same rule an empty selection follows, applied to a full one: for a field whose values are
		// typed in rather than picked, where the input has to stay blank and ready after every commit
		// instead of holding a summary the next keystroke must displace.
		{
			name: 'lets the placeholder through when the summary is empty',
			args: {
				editing: false,
				query: '',
				value: ['12345', '84045'],
				summarize: () => '',
				multiple: true,
			},
			expected: '',
		},
		// The summary is what replaces a list too long to read; one label is not that.
		{
			name: 'leaves a lone selection to its own label rather than summarizing it',
			args: {
				editing: false,
				query: '',
				value: ['12345'],
				displayValue: display,
				summarize: (codes) => `${codes.length} postal codes`,
				multiple: true,
			},
			expected: '12345',
		},
		// Empty rather than "0 postal codes", which is what lets the placeholder through.
		{
			name: 'summarizes nothing when nothing is selected',
			args: {
				editing: false,
				query: '',
				value: [],
				displayValue: display,
				summarize: (codes) => `${codes.length} postal codes`,
				multiple: true,
			},
			expected: '',
		},
		// One item, so only the missing displayValue sends the selection to the count.
		{
			name: 'counts in multi-select mode when there is no displayValue',
			args: { editing: false, query: '', value: ['a'], multiple: true },
			expected: '1 selected',
		},
		{
			name: 'returns an empty string when there is no value',
			args: { editing: false, query: '', value: undefined, displayValue: display, multiple: false },
			expected: '',
		},
		{
			name: 'returns an empty string when there is no displayValue',
			args: { editing: false, query: '', value: 'x', multiple: false },
			expected: '',
		},
	])('$name', ({ args, expected }) => {
		expect(resolveInputDisplay({ intl: intlEn, ...args })).toBe(expected)
	})

	it('counts as soon as a multi selection passes one', () => {
		// Tighter than `Listbox`, which joins up to three, and for a reason particular to this control:
		// the trigger is a real text input, so a joined value longer than the field scrolls; the field
		// shows the middle of a sentence and scrolling right reveals blank space past its end.
		expect(
			resolveInputDisplay({
				intl: intlEn,
				editing: false,
				query: '',
				value: ['a', 'b'],
				displayValue: display,
				multiple: true,
			}),
		).toBe('2 selected')

		expect(
			resolveInputDisplay({
				intl: intlEn,
				editing: false,
				query: '',
				value: ['a', 'b', 'c', 'd'],
				displayValue: display,
				multiple: true,
			}),
		).toBe('4 selected')
	})

	it('shows the query over a multi selection while editing', () => {
		const result = resolveInputDisplay({
			intl: intlEn,
			editing: false,
			query: 'typ',
			value: ['a', 'b'],
			displayValue: display,
			multiple: true,
		})

		// Sanity check on the branch order below: not editing, so the summary wins…
		expect(result).toBe('2 selected')

		// …and editing wins over it, so the summary never blocks typing. Every pick resets
		// `editing`, so the summary comes back between picks.
		expect(
			resolveInputDisplay({
				intl: intlEn,
				editing: true,
				query: 'typ',
				value: ['a', 'b'],
				displayValue: display,
				multiple: true,
			}),
		).toBe('typ')
	})
})

describe('selectSoleOption', () => {
	it('clicks and returns true when exactly one option is present', () => {
		const container = document.createElement('div')

		const clicked = vi.fn()

		optionIn(container).addEventListener('click', clicked)

		expect(selectSoleOption(container)).toBe(true)

		expect(clicked).toHaveBeenCalled()
	})

	it('returns false when there is more than one option', () => {
		const container = document.createElement('div')

		optionIn(container)

		optionIn(container)

		expect(selectSoleOption(container)).toBe(false)
	})

	it('returns false when there are no options', () => {
		const container = document.createElement('div')

		expect(selectSoleOption(container)).toBe(false)
	})
})

describe('enterKeepsSelection', () => {
	// A click on the selected option toggles it, and the toggle clears a `nullable`
	// value. Enter chooses, so in single mode it keeps that option. A `multiple`
	// combobox keeps the toggle.
	it.each([
		['keeps the sole option in single mode', false, true],
		['toggles the sole option in multiple mode', true, false],
	])('%s when that option is already selected', (_name, multiple, keeps) => {
		const container = document.createElement('div')

		optionIn(container, 'data-selected')

		expect(enterKeepsSelection(container, multiple)).toBe(keeps)
	})

	it('reads the highlighted option of a longer list', () => {
		const container = document.createElement('div')

		optionIn(container)

		optionIn(container, 'data-active', 'data-selected')

		expect(enterKeepsSelection(container, false)).toBe(true)
	})

	it('does not keep an option that is not selected', () => {
		const container = document.createElement('div')

		optionIn(container, 'data-active')

		optionIn(container)

		expect(enterKeepsSelection(container, false)).toBe(false)
	})
})

describe('resolveInputTitle', () => {
	it.for<{ name: string; args: TitleArgs; expected: string | undefined }>([
		// The counterpart to the count: the field says how many are picked, this says which, on hover,
		// without the field holding a string longer than itself.
		{
			name: 'spells out a multi selection the field can only count',
			args: { editing: false, value: ['a', 'b', 'c'], displayValue: display, multiple: true },
			expected: 'a, b, c',
		},
		{
			name: 'adds nothing for a lone selection, which the field already names',
			args: { editing: false, value: ['a'], displayValue: display, multiple: true },
			expected: undefined,
		},
		{
			name: 'adds nothing for an empty selection',
			args: { editing: false, value: [], displayValue: display, multiple: true },
			expected: undefined,
		},
		{
			name: 'adds nothing while editing, when the field shows a query rather than a selection',
			args: { editing: true, value: ['a', 'b'], displayValue: display, multiple: true },
			expected: undefined,
		},
		{
			name: 'adds nothing in single-select mode, where the field shows the whole value',
			args: { editing: false, value: 'a', displayValue: display, multiple: false },
			expected: undefined,
		},
		{
			name: 'adds nothing with no resolver, since there are no labels to spell out',
			args: { editing: false, value: ['a', 'b'], multiple: true },
			expected: undefined,
		},
	])('$name', ({ args, expected }) => {
		expect(resolveInputTitle(args)).toBe(expected)
	})
})
