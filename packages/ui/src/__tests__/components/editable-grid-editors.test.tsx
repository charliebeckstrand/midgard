import type { Dispatch, SetStateAction } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EditableGridCurrencyEditor } from '../../components/editable-grid/editable-grid-currency-editor'
import { EditableGridNumberEditor } from '../../components/editable-grid/editable-grid-number-editor'
import { EditableGridTextEditor } from '../../components/editable-grid/editable-grid-text-editor'
import type {
	EditableGridColumn,
	EditableGridEditorProps,
} from '../../components/editable-grid/types'
import { bySlot, fireEvent, renderUI } from '../helpers'

type Row = { id: number; rate: number }

const column: EditableGridColumn<Row> = { id: 'rate', title: 'Rate', field: 'rate' }

function makeProps(
	overrides: Partial<EditableGridEditorProps<Row>> = {},
): EditableGridEditorProps<Row> {
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

describe('EditableGridTextEditor', () => {
	it('mirrors the draft and pushes edits back through setDraft', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(
			<EditableGridTextEditor {...makeProps({ draft: 'CA', setDraft })} />,
		)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		expect(input.value).toBe('CA')

		fireEvent.change(input, { target: { value: 'NV' } })

		expect(setDraft).toHaveBeenCalledWith('NV')
	})

	it('selects the whole draft on mount when opened via Enter / double-click', () => {
		const { container } = renderUI(
			<EditableGridTextEditor {...makeProps({ draft: 'hello', selectAllOnFocus: true })} />,
		)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		expect(document.activeElement).toBe(input)

		expect(input.selectionStart).toBe(0)

		expect(input.selectionEnd).toBe('hello'.length)
	})

	it('places the cursor at the end when opened by typing', () => {
		const { container } = renderUI(
			<EditableGridTextEditor {...makeProps({ draft: 'hello', selectAllOnFocus: false })} />,
		)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		expect(input.selectionStart).toBe('hello'.length)

		expect(input.selectionEnd).toBe('hello'.length)
	})

	it('commits on blur and routes keys through the editor contract', () => {
		const commit = vi.fn(() => true)
		const cancel = vi.fn()

		const { container } = renderUI(<EditableGridTextEditor {...makeProps({ commit, cancel })} />)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(cancel).toHaveBeenCalledTimes(1)

		fireEvent.blur(input)

		expect(commit).toHaveBeenCalledWith('none')
	})
})

describe('EditableGridCurrencyEditor', () => {
	it('seeds the value from the row field and renders the currency slot', () => {
		const { container } = renderUI(
			<EditableGridCurrencyEditor {...makeProps()} currency="USD" locale="en-US" />,
		)

		const input = bySlot(container, 'editable-grid-currency-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		expect(input.value).toContain('2.35')

		expect(document.activeElement).toBe(input)
	})

	it('mirrors numeric edits into the draft as a string', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(
			<EditableGridCurrencyEditor {...makeProps({ setDraft })} currency="USD" locale="en-US" />,
		)

		const input = bySlot(container, 'editable-grid-currency-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '12.50' } })

		expect(setDraft).toHaveBeenCalledWith('12.5')
	})

	it('writes an empty draft when the value is cleared', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(
			<EditableGridCurrencyEditor {...makeProps({ setDraft })} currency="USD" locale="en-US" />,
		)

		const input = bySlot(container, 'editable-grid-currency-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '' } })

		expect(setDraft).toHaveBeenCalledWith('')
	})

	it('starts empty when the field holds a non-numeric value', () => {
		const { container } = renderUI(
			<EditableGridCurrencyEditor
				{...makeProps({
					row: { id: 1, rate: Number.NaN },
					column: { id: 'rate', field: undefined },
				})}
				currency="USD"
				locale="en-US"
			/>,
		)

		const input = bySlot(container, 'editable-grid-currency-input') as HTMLInputElement

		expect(input.value).toBe('')
	})

	it('commits on blur', () => {
		const commit = vi.fn(() => true)

		const { container } = renderUI(
			<EditableGridCurrencyEditor {...makeProps({ commit })} currency="USD" locale="en-US" />,
		)

		fireEvent.blur(bySlot(container, 'editable-grid-currency-input') as HTMLInputElement)

		expect(commit).toHaveBeenCalledWith('none')
	})
})

describe('EditableGridNumberEditor', () => {
	it('seeds the value from the row field and renders the number slot', () => {
		const { container } = renderUI(<EditableGridNumberEditor {...makeProps()} />)

		const input = bySlot(container, 'editable-grid-number-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		expect(input.value).toBe('2.35')

		expect(document.activeElement).toBe(input)
	})

	it('mirrors numeric edits into the draft as a string', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(<EditableGridNumberEditor {...makeProps({ setDraft })} />)

		const input = bySlot(container, 'editable-grid-number-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '7' } })

		expect(setDraft).toHaveBeenCalledWith('7')
	})

	it('writes an empty draft when the value is cleared', () => {
		const setDraft = vi.fn()

		const { container } = renderUI(<EditableGridNumberEditor {...makeProps({ setDraft })} />)

		const input = bySlot(container, 'editable-grid-number-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '' } })

		expect(setDraft).toHaveBeenCalledWith('')
	})

	it('routes Enter through the commit contract', () => {
		const commit = vi.fn(() => true)

		const { container } = renderUI(<EditableGridNumberEditor {...makeProps({ commit })} />)

		fireEvent.keyDown(bySlot(container, 'editable-grid-number-input') as HTMLInputElement, {
			key: 'Enter',
		})

		expect(commit).toHaveBeenCalledWith('down')
	})
})
