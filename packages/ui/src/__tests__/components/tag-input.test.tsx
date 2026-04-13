import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TagInput } from '../../components/tag-input'
import { bySlot, renderUI, userEvent } from '../helpers'

function getInput(container: HTMLElement) {
	return container.querySelector('input[type="text"]') as HTMLInputElement
}

function getRemoveButtons(container: HTMLElement) {
	return Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Remove"]'))
}

describe('TagInput', () => {
	it('renders with data-slot="tag-input"', () => {
		const { container } = renderUI(<TagInput />)

		expect(bySlot(container, 'tag-input')).toBeInTheDocument()
	})

	it('renders a text input', () => {
		const { container } = renderUI(<TagInput />)

		const input = getInput(container)

		expect(input).toBeInTheDocument()
		expect(input.type).toBe('text')
	})

	it('forwards ref to the input', () => {
		const ref = createRef<HTMLInputElement>()

		const { container } = renderUI(<TagInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
		expect(ref.current).toBe(getInput(container))
	})

	it('shows placeholder when there are no tags', () => {
		const { container } = renderUI(<TagInput placeholder="Add tags..." />)

		const input = getInput(container)

		expect(input).toHaveAttribute('placeholder', 'Add tags...')
	})

	it('hides placeholder when tags exist', () => {
		const { container } = renderUI(<TagInput defaultValue={['react']} placeholder="Add tags..." />)

		const input = getInput(container)

		expect(input).not.toHaveAttribute('placeholder')
	})

	it('renders initial tags from defaultValue', () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		expect(container.textContent).toContain('react')
		expect(container.textContent).toContain('vue')
	})

	it('adds a tag on Enter', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'react{Enter}')

		expect(onChange).toHaveBeenCalledWith(['react'])
	})

	it('adds a tag on comma', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'vue,')

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('adds a tag on blur', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'svelte')
		await user.tab()

		expect(onChange).toHaveBeenCalledWith(['svelte'])
	})

	it('does not add duplicate tags', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react']} onChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'react{Enter}')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('removes a tag via its remove button', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} onChange={onChange} />)

		const user = userEvent.setup()

		const removeButtons = getRemoveButtons(container)

		expect(removeButtons.length).toBe(2)

		await user.click(removeButtons[0])

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('removes last tag on Backspace when input is empty', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} onChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.click(input)
		await user.keyboard('{Backspace}')

		expect(onChange).toHaveBeenCalledWith(['react'])
	})

	it('respects max tag limit', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['a', 'b']} max={2} onChange={onChange} />,
		)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'c{Enter}')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('respects validate function', async () => {
		const onChange = vi.fn()

		const validate = (tag: string) => tag.length >= 2

		const { container } = renderUI(<TagInput validate={validate} onChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'x{Enter}')

		expect(onChange).not.toHaveBeenCalled()

		await user.type(input, 'ok{Enter}')

		expect(onChange).toHaveBeenCalledWith(['ok'])
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<TagInput disabled />)

		const input = getInput(container)

		expect(input).toBeDisabled()
	})

	it('hides remove buttons when disabled', () => {
		const { container } = renderUI(<TagInput defaultValue={['react']} disabled />)

		const removeButtons = getRemoveButtons(container)

		expect(removeButtons.length).toBe(0)
	})

	it('applies custom className', () => {
		const { container } = renderUI(<TagInput className="custom" />)

		const tagInput = bySlot(container, 'tag-input')

		expect(tagInput?.className).toContain('custom')
	})
})
