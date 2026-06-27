import type { Dispatch, SetStateAction } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { GridEditableBooleanEditor } from '../../modules/grid/grid-editable-boolean-editor'
import { GridEditableCurrencyEditor } from '../../modules/grid/grid-editable-currency-editor'
import { dateToIso, isoToDate } from '../../modules/grid/grid-editable-date-editor'
import { GridEditableNumberEditor } from '../../modules/grid/grid-editable-number-editor'
import { GridEditableTextEditor } from '../../modules/grid/grid-editable-text-editor'
import type {
	GridEditableColumn,
	GridEditableEditorProps,
} from '../../modules/grid/grid-editable-types'
import { bySlot, fireEvent, renderUI } from '../helpers'

type Row = { id: number; rate: number }

const column: GridEditableColumn<Row> = { id: 'rate', title: 'Rate', field: 'rate' }

function makeProps(
	overrides: Partial<GridEditableEditorProps<Row>> = {},
): GridEditableEditorProps<Row> {
	return {
		row: { id: 1, rate: 2.35 },
		column,
		draft: '',
		setDraft: vi.fn() as unknown as Dispatch<SetStateAction<string>>,
		commit: vi.fn(() => true),
		cancel: vi.fn(),
		align: 'left',
		ariaLabel: 'Edit rate',
		selectAllOnFocus: true,
		...overrides,
	}
}

describe('GridEditableTextEditor', () => {
	it('mirrors the draft and pushes edits back through setDraft', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(
			<GridEditableTextEditor {...makeProps({ draft: 'CA', setDraft })} />,
		)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		expect(input.value).toBe('CA')

		fireEvent.change(input, { target: { value: 'NV' } })

		expect(setDraft).toHaveBeenCalledWith('NV')
	})

	it('selects the whole draft on mount when opened via Enter / double-click', () => {
		const { container } = renderUI(
			<GridEditableTextEditor {...makeProps({ draft: 'hello', selectAllOnFocus: true })} />,
		)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		expect(document.activeElement).toBe(input)

		expect(input.selectionStart).toBe(0)

		expect(input.selectionEnd).toBe('hello'.length)
	})

	it('places the cursor at the end when opened by typing', () => {
		const { container } = renderUI(
			<GridEditableTextEditor {...makeProps({ draft: 'hello', selectAllOnFocus: false })} />,
		)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		expect(input.selectionStart).toBe('hello'.length)

		expect(input.selectionEnd).toBe('hello'.length)
	})

	it('commits on blur and routes keys through the editor contract', () => {
		const commit = vi.fn(() => true)

		const cancel = vi.fn()

		const { container } = renderUI(<GridEditableTextEditor {...makeProps({ commit, cancel })} />)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(cancel).toHaveBeenCalledTimes(1)

		fireEvent.blur(input)

		expect(commit).toHaveBeenCalledWith('none')
	})
})

describe('GridEditableCurrencyEditor', () => {
	it('seeds the value from the row field and renders the currency slot', () => {
		const { container } = renderUI(
			<GridEditableCurrencyEditor {...makeProps()} currency="USD" locale="en-US" />,
		)

		const input = bySlot(container, 'grid-editable-currency-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		expect(input.value).toContain('2.35')

		expect(document.activeElement).toBe(input)
	})

	it('seeds from the draft on type-to-edit so the first keystroke survives', () => {
		// Typing "5" into the active cell seeds the grid draft before the editor
		// mounts; seeding from the row value would silently drop that keystroke.
		const { container } = renderUI(
			<GridEditableCurrencyEditor
				{...makeProps({ draft: '5', selectAllOnFocus: false })}
				currency="USD"
				locale="en-US"
			/>,
		)

		const input = bySlot(container, 'grid-editable-currency-input') as HTMLInputElement

		expect(input.value).toContain('5')

		expect(input.value).not.toContain('2.35')

		// And it must not be selected; the next keystroke would replace it.
		expect(input.selectionStart).toBe(input.selectionEnd)
	})

	it('mirrors numeric edits into the draft as a string', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(
			<GridEditableCurrencyEditor {...makeProps({ setDraft })} currency="USD" locale="en-US" />,
		)

		const input = bySlot(container, 'grid-editable-currency-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '12.50' } })

		expect(setDraft).toHaveBeenCalledWith('12.5')
	})

	it('writes an empty draft when the value is cleared', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(
			<GridEditableCurrencyEditor {...makeProps({ setDraft })} currency="USD" locale="en-US" />,
		)

		const input = bySlot(container, 'grid-editable-currency-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '' } })

		expect(setDraft).toHaveBeenCalledWith('')
	})

	it('starts empty when the field holds a non-numeric value', () => {
		const { container } = renderUI(
			<GridEditableCurrencyEditor
				{...makeProps({
					row: { id: 1, rate: Number.NaN },
					column: { id: 'rate', field: undefined },
				})}
				currency="USD"
				locale="en-US"
			/>,
		)

		const input = bySlot(container, 'grid-editable-currency-input') as HTMLInputElement

		expect(input.value).toBe('')
	})

	it('commits on blur', () => {
		const commit = vi.fn(() => true)

		const { container } = renderUI(
			<GridEditableCurrencyEditor {...makeProps({ commit })} currency="USD" locale="en-US" />,
		)

		fireEvent.blur(bySlot(container, 'grid-editable-currency-input') as HTMLInputElement)

		expect(commit).toHaveBeenCalledWith('none')
	})
})

describe('GridEditableNumberEditor', () => {
	it('seeds the value from the row field and renders the number slot', () => {
		const { container } = renderUI(<GridEditableNumberEditor {...makeProps()} />)

		const input = bySlot(container, 'grid-editable-number-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		expect(input.value).toBe('2.35')

		expect(document.activeElement).toBe(input)
	})

	it('seeds from the draft on type-to-edit so the first keystroke survives', () => {
		const { container } = renderUI(
			<GridEditableNumberEditor {...makeProps({ draft: '5', selectAllOnFocus: false })} />,
		)

		const input = bySlot(container, 'grid-editable-number-input') as HTMLInputElement

		expect(input.value).toBe('5')
	})

	it('mirrors numeric edits into the draft as a string', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(<GridEditableNumberEditor {...makeProps({ setDraft })} />)

		const input = bySlot(container, 'grid-editable-number-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '7' } })

		expect(setDraft).toHaveBeenCalledWith('7')
	})

	it('writes an empty draft when the value is cleared', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(<GridEditableNumberEditor {...makeProps({ setDraft })} />)

		const input = bySlot(container, 'grid-editable-number-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '' } })

		expect(setDraft).toHaveBeenCalledWith('')
	})

	it('routes Enter through the commit contract', () => {
		const commit = vi.fn(() => true)

		const { container } = renderUI(<GridEditableNumberEditor {...makeProps({ commit })} />)

		fireEvent.keyDown(bySlot(container, 'grid-editable-number-input') as HTMLInputElement, {
			key: 'Enter',
		})

		expect(commit).toHaveBeenCalledWith('down')
	})
})

describe('GridEditableBooleanEditor', () => {
	type BooleanRow = { id: number; active: boolean }

	const booleanColumn: GridEditableColumn<BooleanRow> = { id: 'active', field: 'active' }

	function booleanProps(
		overrides: Partial<GridEditableEditorProps<BooleanRow>> = {},
	): GridEditableEditorProps<BooleanRow> {
		return {
			row: { id: 1, active: true },
			column: booleanColumn,
			draft: 'true',
			setDraft: vi.fn() as unknown as Dispatch<SetStateAction<string>>,
			commit: vi.fn(() => true),
			cancel: vi.fn(),
			align: 'left',
			ariaLabel: 'Edit active',
			selectAllOnFocus: true,
			...overrides,
		}
	}

	it('reflects the field value and focuses on mount', () => {
		const { container } = renderUI(<GridEditableBooleanEditor {...booleanProps()} />)

		const checkbox = bySlot(container, 'grid-editable-boolean-input') as HTMLInputElement

		expect(checkbox).toBeChecked()

		expect(document.activeElement).toBe(checkbox)
	})

	it('commits the flipped value and advances on toggle', () => {
		const setDraft = vi.fn()

		const commit = vi.fn(() => true)

		const { container } = renderUI(
			<GridEditableBooleanEditor {...booleanProps({ setDraft, commit })} />,
		)

		fireEvent.click(bySlot(container, 'grid-editable-boolean-input') as HTMLInputElement)

		expect(setDraft).toHaveBeenCalledWith('false')

		expect(commit).toHaveBeenCalledWith('down')
	})

	it('cancels on Escape and commits on blur', () => {
		const commit = vi.fn(() => true)

		const cancel = vi.fn()

		const { container } = renderUI(
			<GridEditableBooleanEditor {...booleanProps({ commit, cancel })} />,
		)

		const checkbox = bySlot(container, 'grid-editable-boolean-input') as HTMLInputElement

		fireEvent.keyDown(checkbox, { key: 'Escape' })

		expect(cancel).toHaveBeenCalledTimes(1)

		fireEvent.blur(checkbox)

		expect(commit).toHaveBeenCalledWith('none')
	})
})

describe('date ISO helpers', () => {
	it('round-trips a calendar date through local time without a day-shift', () => {
		const date = isoToDate('2026-01-15')

		expect(date).toBeInstanceOf(Date)

		expect(date?.getFullYear()).toBe(2026)

		expect(date?.getMonth()).toBe(0)

		expect(date?.getDate()).toBe(15)

		expect(dateToIso(date as Date)).toBe('2026-01-15')
	})

	it('returns undefined for a non-date string', () => {
		expect(isoToDate('')).toBeUndefined()

		expect(isoToDate('nope')).toBeUndefined()

		expect(isoToDate('2026/01/15')).toBeUndefined()
	})

	it('zero-pads month and day', () => {
		expect(dateToIso(new Date(2026, 2, 4))).toBe('2026-03-04')
	})
})
