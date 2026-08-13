import { describe, expect, it, vi } from 'vitest'
import {
	resolveInputDisplay,
	resolveInputTitle,
	selectSoleOption,
} from '../../components/combobox/combobox-utilities'

describe('resolveInputDisplay', () => {
	it('returns the query while the user is editing', () => {
		const result = resolveInputDisplay({
			editing: true,
			query: 'partial',
			value: 'real',
			displayValue: (v) => v as string,
			multiple: false,
		})

		expect(result).toBe('partial')
	})

	it('returns the displayed value when not editing in single-select mode', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: '',
			value: { id: 1, name: 'Alice' },
			displayValue: (v) => (v as { name: string }).name,
			multiple: false,
		})

		expect(result).toBe('Alice')
	})

	it('shows a lone multi selection as its own label', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: '',
			value: ['a'],
			displayValue: (v) => (v as string).toUpperCase(),
			multiple: true,
		})

		// It used to return empty for any multi selection, which left the combobox showing nothing at
		// all above a filter that WAS applied — the trigger's whole job.
		expect(result).toBe('A')
	})

	it('counts as soon as a multi selection passes one', () => {
		// Tighter than `Listbox`, which joins up to three, and for a reason particular to this control:
		// the trigger is a real text input, so a joined value longer than the field scrolls — the field
		// shows the middle of a sentence and scrolling right reveals blank space past its end.
		expect(
			resolveInputDisplay({
				editing: false,
				query: '',
				value: ['a', 'b'],
				displayValue: (v) => v as string,
				multiple: true,
			}),
		).toBe('2 selected')

		expect(
			resolveInputDisplay({
				editing: false,
				query: '',
				value: ['a', 'b', 'c', 'd'],
				displayValue: (v) => v as string,
				multiple: true,
			}),
		).toBe('4 selected')
	})

	it('lets the caller name what it is counting', () => {
		// The threshold stays the control's — a text input whose content scrolls has to stop listing
		// somewhere — while the noun is the caller's. "2 selected" beside a label reading "Postal
		// codes" is fine; in a row of six filters it says how many of nothing in particular.
		expect(
			resolveInputDisplay({
				editing: false,
				query: '',
				value: ['12345', '84045'],
				displayValue: (v) => v as string,
				summarize: (codes) => `${codes.length} postal codes`,
				multiple: true,
			}),
		).toBe('2 postal codes')
	})

	it('summarizes with no displayValue too, which is the case that can only count', () => {
		expect(
			resolveInputDisplay({
				editing: false,
				query: '',
				value: ['a', 'b'],
				summarize: (items) => `${items.length} things`,
				multiple: true,
			}),
		).toBe('2 things')
	})

	it('lets the placeholder through when the summary is empty', () => {
		// The same rule an empty selection follows, applied to a full one — for a field whose values are
		// typed in rather than picked, where the input has to stay blank and ready after every commit
		// instead of holding a summary the next keystroke must displace.
		expect(
			resolveInputDisplay({
				editing: false,
				query: '',
				value: ['12345', '84045'],
				summarize: () => '',
				multiple: true,
			}),
		).toBe('')
	})

	it('leaves a lone selection to its own label rather than summarizing it', () => {
		// The summary is what replaces a list too long to read; one label is not that.
		expect(
			resolveInputDisplay({
				editing: false,
				query: '',
				value: ['12345'],
				displayValue: (v) => v as string,
				summarize: (codes) => `${codes.length} postal codes`,
				multiple: true,
			}),
		).toBe('12345')
	})

	it('summarizes nothing when nothing is selected', () => {
		// Empty rather than "0 postal codes", which is what lets the placeholder through.
		expect(
			resolveInputDisplay({
				editing: false,
				query: '',
				value: [],
				displayValue: (v) => v as string,
				summarize: (codes) => `${codes.length} postal codes`,
				multiple: true,
			}),
		).toBe('')
	})

	it('counts in multi-select mode when there is no displayValue', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: '',
			value: ['a', 'b'],
			multiple: true,
		})

		expect(result).toBe('2 selected')
	})

	it('returns an empty string for an empty multi selection', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: '',
			value: [],
			displayValue: (v) => v as string,
			multiple: true,
		})

		// Empty rather than "0 selected", which is what lets the placeholder through.
		expect(result).toBe('')
	})

	it('shows the query over a multi selection while editing', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: 'typ',
			value: ['a', 'b'],
			displayValue: (v) => v as string,
			multiple: true,
		})

		// Sanity check on the branch order below: not editing, so the summary wins…
		expect(result).toBe('2 selected')

		// …and editing wins over it, so the summary never blocks typing. Every pick resets
		// `editing`, so the summary comes back between picks.
		expect(
			resolveInputDisplay({
				editing: true,
				query: 'typ',
				value: ['a', 'b'],
				displayValue: (v) => v as string,
				multiple: true,
			}),
		).toBe('typ')
	})

	it('returns an empty string when there is no value', () => {
		const result = resolveInputDisplay<string>({
			editing: false,
			query: '',
			value: undefined,
			displayValue: (v) => v,
			multiple: false,
		})

		expect(result).toBe('')
	})

	it('returns an empty string when there is no displayValue', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: '',
			value: 'x',
			multiple: false,
		})

		expect(result).toBe('')
	})
})

describe('selectSoleOption', () => {
	it('clicks and returns true when exactly one option is present', () => {
		const container = document.createElement('div')

		const option = document.createElement('div')

		option.setAttribute('role', 'option')

		const clicked = vi.fn()

		option.addEventListener('click', clicked)

		container.appendChild(option)

		expect(selectSoleOption(container)).toBe(true)

		expect(clicked).toHaveBeenCalled()
	})

	it('returns false when there is more than one option', () => {
		const container = document.createElement('div')

		const a = document.createElement('div')

		a.setAttribute('role', 'option')

		container.appendChild(a)

		const b = document.createElement('div')

		b.setAttribute('role', 'option')

		container.appendChild(b)

		expect(selectSoleOption(container)).toBe(false)
	})

	it('returns false when there are no options', () => {
		const container = document.createElement('div')

		expect(selectSoleOption(container)).toBe(false)
	})
})

describe('resolveInputTitle', () => {
	const display = (v: unknown) => v as string

	it('spells out a multi selection the field can only count', () => {
		// The counterpart to the count: the field says how many are picked, this says which, on hover —
		// without the field holding a string longer than itself.
		expect(
			resolveInputTitle({
				editing: false,
				value: ['a', 'b', 'c'],
				displayValue: display,
				multiple: true,
			}),
		).toBe('a, b, c')
	})

	it('adds nothing for a lone selection, which the field already names', () => {
		expect(
			resolveInputTitle({ editing: false, value: ['a'], displayValue: display, multiple: true }),
		).toBeUndefined()
	})

	it('adds nothing for an empty selection', () => {
		expect(
			resolveInputTitle({ editing: false, value: [], displayValue: display, multiple: true }),
		).toBeUndefined()
	})

	it('adds nothing while editing, when the field shows a query rather than a selection', () => {
		expect(
			resolveInputTitle({
				editing: true,
				value: ['a', 'b'],
				displayValue: display,
				multiple: true,
			}),
		).toBeUndefined()
	})

	it('adds nothing in single-select mode, where the field shows the whole value', () => {
		expect(
			resolveInputTitle({ editing: false, value: 'a', displayValue: display, multiple: false }),
		).toBeUndefined()
	})

	it('adds nothing with no resolver, since there are no labels to spell out', () => {
		expect(resolveInputTitle({ editing: false, value: ['a', 'b'], multiple: true })).toBeUndefined()
	})
})
