import { createRef, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import { TagInput } from '../../components/tag-input'
import { bySlot, fireEvent, liveRegion, renderUI, screen, userEvent, waitFor } from '../helpers'

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
	it('renders duplicate controlled values without key collisions', () => {
		const { container } = renderUI(
			<TagInput value={['a', 'a']} onValueChange={() => {}} aria-label="Tags" />,
		)

		// The controlled path can't dedupe; both badges must render.
		const list = container.querySelector('[data-slot="tags"]')

		expect(list?.children.length).toBe(2)
	})

	it('renders an input', () => {
		const { container } = renderUI(<TagInput />)

		const input = getInput(container)

		expect(input).toBeInTheDocument()

		expect(input.tagName).toBe('INPUT')
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

	it.each([
		['sm', 'xs'],
		['md', 'sm'],
		['lg', 'md'],
	] as const)('steps badges down one size at control size %s', (controlSize, badgeSize) => {
		const { container } = renderUI(<TagInput size={controlSize} defaultValue={['react']} />)

		expect(getBadges(container)[0]).toHaveAttribute('data-size', badgeSize)
	})

	it('steps badges down from the density-resolved size when size is omitted', () => {
		// Default density is md; the badge rides the same affix broadcast.
		const { container } = renderUI(<TagInput defaultValue={['react']} />)

		expect(getBadges(container)[0]).toHaveAttribute('data-size', 'sm')
	})

	it('adds a tag on Enter', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup({ delay: null })

		await user.type(input, 'react{Enter}')

		expect(onChange).toHaveBeenCalledWith(['react'])
	})

	it('adds a tag on comma', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup({ delay: null })

		await user.type(input, 'vue,')

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('adds a tag on blur', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup({ delay: null })

		await user.type(input, 'svelte')

		await user.tab()

		expect(onChange).toHaveBeenCalledWith(['svelte'])
	})

	it('does not add duplicate tags', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react']} onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup({ delay: null })

		await user.type(input, 'react{Enter}')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('removes a tag via its remove button', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react', 'vue']} onValueChange={onChange} />,
		)

		const user = userEvent.setup({ delay: null })

		const removeButtons = getRemoveButtons(container)

		expect(removeButtons.length).toBe(2)

		await user.click(removeButtons[0] as Element)

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('returns focus to the input after removing a tag via its badge', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = userEvent.setup({ delay: null })

		await user.click(getRemoveButtons(container)[0] as Element)

		// Focus must not strand on the now-detached badge (WCAG 2.4.3).
		expect(document.activeElement).toBe(getInput(container))
	})

	it('returns focus to the input when removing the tag that was at max', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} max={2} />)

		const input = getInput(container)

		// At the cap the field is read-only, not disabled, so it stays focusable;
		// removing a tag clears the cap and returns focus to the input.
		expect(input).not.toBeDisabled()

		expect(input).toHaveAttribute('readonly')

		const user = userEvent.setup({ delay: null })

		await user.click(getRemoveButtons(container)[0] as Element)

		expect(document.activeElement).toBe(getInput(container))

		expect(getInput(container)).not.toHaveAttribute('readonly')
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

		const user = userEvent.setup({ delay: null })

		;(getBadges(container)[0] as HTMLElement).focus()

		await user.keyboard('{Backspace}')

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('removes the focused tag on Delete', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react', 'vue']} onValueChange={onChange} />,
		)

		const user = userEvent.setup({ delay: null })

		;(getBadges(container)[1] as HTMLElement).focus()

		await user.keyboard('{Delete}')

		expect(onChange).toHaveBeenCalledWith(['react'])
	})

	it('leaves the focused tag in place on other keys', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react']} onValueChange={onChange} />)

		const user = userEvent.setup({ delay: null })

		;(getBadges(container)[0] as HTMLElement).focus()

		await user.keyboard('{Enter}')

		await user.keyboard('a')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('returns focus to the input after removing the focused tag with Backspace', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = userEvent.setup({ delay: null })

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

		const user = userEvent.setup({ delay: null })

		await user.click(input)

		await user.keyboard('{Backspace}')

		expect(onChange).toHaveBeenCalledWith(['react'])
	})

	it('goes read-only at the cap, keeping the control enabled and tags removable', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['a', 'b']} max={2} onValueChange={onChange} />,
		)

		const input = getInput(container)

		// At the cap the field is read-only rather than disabled, so the control
		// isn't greyed and the tags stay removable; the Add button is disabled.
		expect(input).toHaveAttribute('readonly')

		expect(input).not.toBeDisabled()

		const addButton = bySlot(container, 'suffix')?.querySelector('button') as HTMLButtonElement

		expect(addButton).toBeDisabled()

		const user = userEvent.setup({ delay: null })

		await user.click(getRemoveButtons(container)[0] as Element)

		expect(onChange).toHaveBeenCalledWith(['b'])
	})

	it('respects validate function', async () => {
		const onChange = vi.fn()

		const validate = (tag: string) => tag.length >= 2

		const { container } = renderUI(<TagInput validate={validate} onValueChange={onChange} />)

		const input = getInput(container)

		const user = userEvent.setup({ delay: null })

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

	it('keeps badges out of the tab order when disabled', () => {
		const { container } = renderUI(<TagInput defaultValue={['react']} disabled />)

		expect(getBadges(container)[0]).not.toHaveAttribute('tabindex')
	})

	it('ignores Backspace/Delete on badges when disabled', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react']} onValueChange={onChange} disabled />,
		)

		const badge = getBadges(container)[0] as HTMLElement

		fireEvent.keyDown(badge, { key: 'Backspace' })

		fireEvent.keyDown(badge, { key: 'Delete' })

		expect(onChange).not.toHaveBeenCalled()
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

		const user = userEvent.setup({ delay: null })

		await user.type(input, 'svelte')

		const addButton = bySlot(container, 'suffix')?.querySelector('button') as HTMLButtonElement

		await user.click(addButton)

		expect(onChange).toHaveBeenCalledWith(['svelte'])

		expect(input.value).toBe('')
	})
})

/**
 * Pasting a list is the commonest way to fill a token field, and it used to commit NOTHING: the draft
 * only tokenized on a `keydown`, which a paste never fires, so a forty-code column sat in the input
 * until blur refused the whole string as one invalid tag.
 *
 * These fire a real `paste` event with `clipboardData`. `user.type` and `fireEvent.keyDown` cannot
 * reach this path — which is exactly the gap that let the defect ship under a test whose comment
 * claimed paste coverage.
 */
function paste(input: HTMLInputElement, text: string) {
	fireEvent.paste(input, { clipboardData: { getData: () => text } })
}

describe('TagInput paste', () => {
	it.each([
		['a comma-separated list', '77002,77003,77004'],
		['a newline-separated column', '77002\n77003\n77004'],
		['a Windows-newline column', '77002\r\n77003\r\n77004'],
		['a tab-separated row', '77002\t77003\t77004'],
	])('commits every token in %s', (_name, text) => {
		const { container } = renderUI(<TagInput placeholder="Zip" />)

		paste(getInput(container), text)

		expect(getBadges(container).map((badge) => badge.textContent)).toEqual([
			'77002',
			'77003',
			'77004',
		])

		// The draft is emptied, not left holding the pasted string.
		expect(getInput(container)).toHaveValue('')
	})

	it('leaves a paste with no delimiter to land as ordinary typing', () => {
		const { container } = renderUI(<TagInput placeholder="Zip" />)

		paste(getInput(container), '77002')

		// One code pasted mid-edit is not a commit — it continues the draft, so the user can keep
		// typing. Nothing is committed until a delimiter, Enter, blur or the Add button.
		expect(getBadges(container)).toHaveLength(0)
	})

	it('adds a pasted list to tags already held, skipping repeats', () => {
		const { container } = renderUI(<TagInput defaultValue={['77002']} placeholder="Zip" />)

		paste(getInput(container), '77002,77003')

		expect(getBadges(container).map((badge) => badge.textContent)).toEqual(['77002', '77003'])
	})

	it('keeps refused tokens in the draft and marks the field invalid', () => {
		const { container } = renderUI(
			<TagInput placeholder="Zip" validate={(tag) => /^\d{5}$/.test(tag)} />,
		)

		paste(getInput(container), '77002,oops,77003,nope')

		// The batch is not all-or-nothing, and the failures are localized to the exact tokens rather
		// than announced once and lost — the user edits two words instead of hunting through forty.
		expect(getBadges(container).map((badge) => badge.textContent)).toEqual(['77002', '77003'])

		expect(getInput(container)).toHaveValue('oops nope')

		// Sighted feedback, which a rejected draft had none of: `invalid` could previously only arrive
		// from a bound Form field, so a refused paste read as nothing having happened.
		expect(getInput(container)).toHaveAttribute('aria-invalid', 'true')
	})

	it('clears the invalid mark on the next keystroke', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<TagInput placeholder="Zip" validate={(tag) => /^\d{5}$/.test(tag)} />,
		)

		paste(getInput(container), 'oops,nope')

		expect(getInput(container)).toHaveAttribute('aria-invalid', 'true')

		await user.type(getInput(container), '1')

		expect(getInput(container)).not.toHaveAttribute('aria-invalid', 'true')
	})

	it('fills only the remaining room at the cap', () => {
		const { container } = renderUI(<TagInput defaultValue={['a']} max={2} placeholder="Zip" />)

		paste(getInput(container), 'b,c,d')

		expect(getBadges(container).map((badge) => badge.textContent)).toEqual(['a', 'b'])
	})

	it('announces the batch once rather than once per tag', async () => {
		const { container } = renderUI(<TagInput placeholder="Zip" />)

		paste(getInput(container), '77002,77003,77004')

		// `announce` clears then sets on the next microtask, so a live region only ever reports an
		// observed mutation — the read has to come after that tick.
		await waitFor(() => expect(liveRegion()).toHaveTextContent('Added 3 tags'))

		// And ONE message, not three: the count replaces what would have been a per-tag stream.
		expect(liveRegion()).not.toHaveTextContent('Added 77002')
	})
})

describe('TagInput multi-token draft', () => {
	it('commits every token when the Add button takes a multi-token draft', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<TagInput placeholder="Zip" />)

		await user.type(getInput(container), '77002 77003')

		// The button was enabled for a multi-token draft and did nothing when pressed, because it called
		// a single-tag path. Every commit channel now routes through the same tokenizer.
		await user.click(screen.getByRole('button', { name: 'Add tag' }))

		expect(getBadges(container).map((badge) => badge.textContent)).toEqual(['77002', '77003'])
	})

	it('commits every token in a multi-token draft on Enter', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<TagInput placeholder="Zip" />)

		await user.type(getInput(container), '77002 77003{Enter}')

		expect(getBadges(container).map((badge) => badge.textContent)).toEqual(['77002', '77003'])
	})
})

describe('TagInput announcements', () => {
	it.each<[string, () => ReactElement, string, string]>([
		['announces an added tag', () => <TagInput />, 'react{Enter}', 'Added react'],
		[
			'names the reason when a duplicate is rejected',
			() => <TagInput defaultValue={['react']} />,
			'react{Enter}',
			'react is already in the list',
		],
		[
			'names the reason when validation rejects a tag',
			() => <TagInput validate={(tag) => tag.length >= 2} />,
			'x{Enter}',
			'x is not a valid tag',
		],
	])('%s', async (_name, ui, typed, announcement) => {
		const { container } = renderUI(ui())

		const user = userEvent.setup({ delay: null })

		await user.type(getInput(container), typed)

		expect(liveRegion()).toHaveTextContent(announcement)
	})

	it('announces a removed tag', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = userEvent.setup({ delay: null })

		await user.click(getRemoveButtons(container)[0] as Element)

		expect(liveRegion()).toHaveTextContent('Removed react')
	})
})

describe('TagInput + Form', () => {
	it('seeds from Form.defaultValues and submits the bound tag array', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ topics: ['react'] }} onSubmit={onSubmit}>
				<TagInput name="topics" />
				<button type="submit">Submit</button>
			</Form>,
		)

		// The default value renders as a badge.
		expect(getBadges(container).map((b) => b.textContent)).toContain('react')

		const user = userEvent.setup({ delay: null })

		await user.type(getInput(container), 'vue{Enter}')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ topics: ['react', 'vue'] }),
			expect.anything(),
		)
	})

	it('lets an explicit value prop override the bound field', () => {
		const { container } = renderUI(
			<Form defaultValues={{ topics: ['fromForm'] }}>
				<TagInput name="topics" value={['explicit']} onValueChange={() => {}} />
			</Form>,
		)

		const labels = getBadges(container).map((b) => b.textContent)

		expect(labels).toContain('explicit')

		expect(labels).not.toContain('fromForm')
	})

	it('merges a field-level error from the Form into the invalid state', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ topics: [] as string[] }}
				validate={{ topics: (v) => ((v as string[]).length === 0 ? 'Add a topic' : undefined) }}
				validateOn="touched"
			>
				<TagInput name="topics" />
			</Form>,
		)

		const input = getInput(container)

		expect(input).not.toHaveAttribute('aria-invalid')

		// Blur marks the field touched (TagInput.handleBlur → setTouched); the
		// empty-array rule then fails and the error merges into invalid.
		fireEvent.blur(input)

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})
})
