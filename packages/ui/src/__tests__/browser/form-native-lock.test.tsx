import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Form, FormFilters, FormSubmit } from '../../modules/form'
import { deferred, getSlot, renderUI } from '../helpers'

/**
 * A submit locks the native fields of its form, which read no lock scope. The
 * guard reads native events that jsdom does not dispatch, such as
 * `beforeinput` and the change of a radio from an arrow key. So this file runs
 * in the real browser.
 */
describe('Form native lock (real browser)', () => {
	function renderNative(onSubmit: () => Promise<void>) {
		const onTextChange = vi.fn()

		const onBoxChange = vi.fn()

		const onSelectChange = vi.fn()

		const view = renderUI(
			<Form defaultValues={{}} onSubmit={onSubmit}>
				<input aria-label="Text" defaultValue="Ada" onChange={onTextChange} />
				<textarea aria-label="Notes" defaultValue="Hi" />
				<label>
					<input type="checkbox" aria-label="Terms" onChange={onBoxChange} />
					Terms
				</label>
				<input type="radio" name="plan" value="free" aria-label="Free" defaultChecked />
				<input type="radio" name="plan" value="pro" aria-label="Pro" />
				<select aria-label="Size" defaultValue="s" onChange={onSelectChange}>
					<option value="s">Small</option>
					<option value="m">Medium</option>
				</select>
				<input type="range" aria-label="Volume" defaultValue="5" min="0" max="10" />
				<FormSubmit>Save</FormSubmit>
			</Form>,
		)

		const field = <E extends HTMLElement>(name: string) =>
			view.container.querySelector<E>(`[aria-label="${name}"]`) as E

		const button = getSlot<HTMLButtonElement>(view.container, 'form-submit')

		return { field, button, onTextChange, onBoxChange, onSelectChange }
	}

	async function startSubmit(button: HTMLButtonElement) {
		button.click()

		await expect.poll(() => button.getAttribute('aria-busy')).toBe('true')
	}

	it('refuses a keystroke and a deletion in a bare text field, and keeps the focus', async () => {
		const pending = deferred()

		const { field, button, onTextChange } = renderNative(() => pending.promise)

		const text = field<HTMLInputElement>('Text')

		const notes = field<HTMLTextAreaElement>('Notes')

		await startSubmit(button)

		text.focus()

		await userEvent.keyboard('x{Backspace}{Backspace}')

		expect(text.value).toBe('Ada')

		expect(onTextChange).not.toHaveBeenCalled()

		expect(document.activeElement).toBe(text)

		expect(text.disabled).toBe(false)

		notes.focus()

		await userEvent.keyboard('there')

		expect(notes.value).toBe('Hi')

		pending.resolve()

		await expect.poll(() => button.getAttribute('aria-busy')).toBeNull()

		text.focus()

		await userEvent.keyboard('x')

		expect(text.value).toBe('Adax')

		expect(onTextChange).toHaveBeenCalledOnce()
	})

	it('refuses the toggle of a bare check box from its label and from the keyboard', async () => {
		const pending = deferred()

		const { field, button, onBoxChange } = renderNative(() => pending.promise)

		const box = field<HTMLInputElement>('Terms')

		await startSubmit(button)

		;(box.closest('label') as HTMLLabelElement).click()

		box.focus()

		await userEvent.keyboard(' ')

		expect(box.checked).toBe(false)

		expect(onBoxChange).not.toHaveBeenCalled()

		pending.resolve()

		await expect.poll(() => button.getAttribute('aria-busy')).toBeNull()

		await userEvent.keyboard(' ')

		expect(box.checked).toBe(true)

		expect(onBoxChange).toHaveBeenCalledOnce()
	})

	it('keeps the checked radio of a bare group against a click and an arrow key', async () => {
		const pending = deferred()

		const { field, button } = renderNative(() => pending.promise)

		const free = field<HTMLInputElement>('Free')

		const pro = field<HTMLInputElement>('Pro')

		await startSubmit(button)

		pro.click()

		free.focus()

		await userEvent.keyboard('{ArrowDown}')

		expect(free.checked).toBe(true)

		expect(pro.checked).toBe(false)

		pending.resolve()

		await expect.poll(() => button.getAttribute('aria-busy')).toBeNull()

		pro.click()

		expect(pro.checked).toBe(true)
	})

	it('puts back the value of a bare select and a bare range', async () => {
		const pending = deferred()

		const { field, button, onSelectChange } = renderNative(() => pending.promise)

		const size = field<HTMLSelectElement>('Size')

		const volume = field<HTMLInputElement>('Volume')

		await startSubmit(button)

		await userEvent.selectOptions(size, 'm')

		volume.focus()

		await userEvent.keyboard('{ArrowRight}')

		expect(size.value).toBe('s')

		expect(onSelectChange).not.toHaveBeenCalled()

		expect(volume.value).toBe('5')

		pending.resolve()

		await expect.poll(() => button.getAttribute('aria-busy')).toBeNull()

		await userEvent.selectOptions(size, 'm')

		expect(size.value).toBe('m')

		expect(onSelectChange).toHaveBeenCalledOnce()
	})

	it('leaves a bare field of a filter bar inside the form live', async () => {
		const pending = deferred()

		const { container } = renderUI(
			<Form defaultValues={{}} onSubmit={() => pending.promise}>
				<FormFilters aria-label="Filters">
					<input aria-label="Search" />
				</FormFilters>
				<FormSubmit>Save</FormSubmit>
			</Form>,
		)

		const button = getSlot<HTMLButtonElement>(container, 'form-submit')

		const search = container.querySelector<HTMLInputElement>('[aria-label="Search"]')

		await startSubmit(button)

		search?.focus()

		await userEvent.keyboard('ok')

		expect(search?.value).toBe('ok')

		pending.resolve()
	})
})
