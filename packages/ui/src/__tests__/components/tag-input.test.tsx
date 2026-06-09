import { describe, expect, it, vi } from 'vitest'
import { TagInput } from '../../components/tag-input'
import {
	bySlot,
	expectLiveRegionText,
	expectSlot,
	itForwardsRef,
	renderUI,
	userEvent,
	waitFor,
} from '../helpers'

function getInput(container: HTMLElement) {
	return bySlot(container, 'input') as HTMLInputElement
}

function getRemoveButtons(container: HTMLElement) {
	return Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Remove"]'))
}

function getBadges(container: HTMLElement) {
	return Array.from(container.querySelectorAll<HTMLElement>('[role="listitem"]'))
}

describe('TagInput', () => {
	it('renders an input', () => {
		const { container } = renderUI(<TagInput />)

		expectSlot(container, 'input', 'input')
	})

	itForwardsRef<HTMLInputElement>((ref) => <TagInput ref={ref} />, 'input')

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

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'react{Enter}')

		expect(onChange).toHaveBeenCalledWith(['react'])
	})

	it('adds a tag on comma', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'vue,')

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('adds a tag on blur', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'svelte')
		await user.tab()

		expect(onChange).toHaveBeenCalledWith(['svelte'])
	})

	it('does not add duplicate tags', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react']} onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'react{Enter}')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('removes a tag via its remove button', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react', 'vue']} onValueChange={onChange} />,
		)

		const user = userEvent.setup()

		const removeButtons = getRemoveButtons(container)

		expect(removeButtons.length).toBe(2)

		await user.click(removeButtons[0] as Element)

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('returns focus to the input after removing a tag via its badge', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = userEvent.setup()

		await user.click(getRemoveButtons(container)[0] as Element)

		// Focus must not strand on the now-detached badge (WCAG 2.4.3).
		expect(document.activeElement).toBe(getInput(container))
	})

	it('returns focus to the input when removing the tag that was at max', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} max={2} />)

		const input = getInput(container)

		// At max the input is disabled; removing a tag re-enables it and the
		// onMaxReleased path restores focus once it can hold focus again.
		expect(input).toBeDisabled()

		const user = userEvent.setup()

		await user.click(getRemoveButtons(container)[0] as Element)

		await waitFor(() => expect(document.activeElement).toBe(getInput(container)))
	})

	it('makes each tag badge focusable', () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const badges = getBadges(container)

		expect(badges.length).toBe(2)

		for (const badge of badges) {
			expect(badge).toHaveAttribute('tabindex', '0')
		}
	})

	it('keeps the remove button out of the tab order', () => {
		const { container } = renderUI(<TagInput defaultValue={['react']} />)

		// The badge owns keyboard removal (Backspace/Delete); its inner button is
		// reachable by pointer only, so Tab lands on the badge, not the button.
		expect(getRemoveButtons(container)[0]).toHaveAttribute('tabindex', '-1')
	})

	it('removes the focused tag on Backspace', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react', 'vue']} onValueChange={onChange} />,
		)

		const user = userEvent.setup()

		;(getBadges(container)[0] as HTMLElement).focus()

		await user.keyboard('{Backspace}')

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('removes the focused tag on Delete', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react', 'vue']} onValueChange={onChange} />,
		)

		const user = userEvent.setup()

		;(getBadges(container)[1] as HTMLElement).focus()

		await user.keyboard('{Delete}')

		expect(onChange).toHaveBeenCalledWith(['react'])
	})

	it('leaves the focused tag in place on other keys', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react']} onValueChange={onChange} />)

		const user = userEvent.setup()

		;(getBadges(container)[0] as HTMLElement).focus()

		await user.keyboard('{Enter}')
		await user.keyboard('a')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('returns focus to the input after removing the focused tag with Backspace', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = userEvent.setup()

		;(getBadges(container)[0] as HTMLElement).focus()

		await user.keyboard('{Backspace}')

		// Focus must not strand on the now-detached badge (WCAG 2.4.3).
		expect(document.activeElement).toBe(getInput(container))
	})

	it('removes last tag on Backspace when input is empty', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react', 'vue']} onValueChange={onChange} />,
		)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.click(input)
		await user.keyboard('{Backspace}')

		expect(onChange).toHaveBeenCalledWith(['react'])
	})

	it('respects max tag limit', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['a', 'b']} max={2} onValueChange={onChange} />,
		)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'c{Enter}')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('respects validate function', async () => {
		const onChange = vi.fn()

		const validate = (tag: string) => tag.length >= 2

		const { container } = renderUI(<TagInput validate={validate} onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'x{Enter}')

		expect(onChange).not.toHaveBeenCalled()

		await user.clear(input)

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

	it('renders tags slot when tags exist', () => {
		const { container } = renderUI(<TagInput defaultValue={['react']} />)

		expect(bySlot(container, 'tags')).toBeInTheDocument()
	})

	it('exposes the tags as an enumerable list', () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const list = bySlot(container, 'tags') as HTMLElement

		expect(list).toHaveAttribute('role', 'list')

		expect(list).toHaveAttribute('aria-label', 'Tags')

		expect(list.querySelectorAll('[role="listitem"]')).toHaveLength(2)
	})

	it('has aria-label on the input derived from placeholder', () => {
		const { container } = renderUI(<TagInput placeholder="Add tags..." />)

		const input = getInput(container)

		expect(input).toHaveAttribute('aria-label', 'Add tags...')
	})

	it('has default aria-label on the input when no placeholder', () => {
		const { container } = renderUI(<TagInput />)

		const input = getInput(container)

		expect(input).toHaveAttribute('aria-label', 'Add tags')
	})

	it('adds a tag when the suffix Add button is clicked', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup()

		await user.type(input, 'svelte')

		const addButton = bySlot(container, 'suffix')?.querySelector('button') as HTMLButtonElement

		await user.click(addButton)

		expect(onChange).toHaveBeenCalledWith(['svelte'])

		expect(input.value).toBe('')
	})
})

describe('TagInput announcements', () => {
	it('announces an added tag', async () => {
		const { container } = renderUI(<TagInput />)

		const user = userEvent.setup()

		await user.type(getInput(container), 'react{Enter}')

		await expectLiveRegionText('Added react')
	})

	it('announces a removed tag', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = userEvent.setup()

		await user.click(getRemoveButtons(container)[0] as Element)

		await expectLiveRegionText('Removed react')
	})

	it('names the reason when a duplicate is rejected', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react']} />)

		const user = userEvent.setup()

		await user.type(getInput(container), 'react{Enter}')

		await expectLiveRegionText('react is already in the list')
	})

	it('names the reason when validation rejects a tag', async () => {
		const { container } = renderUI(<TagInput validate={(tag) => tag.length >= 2} />)

		const user = userEvent.setup()

		await user.type(getInput(container), 'x{Enter}')

		await expectLiveRegionText('x is not a valid tag')
	})
})
