import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { Form } from '../../components/form'
import { TagInput } from '../../components/tag-input'
import {
	expectAnnouncement,
	fireEvent,
	getSlot,
	liveRegion,
	present,
	renderUI,
	screen,
	setupUser,
} from '../helpers'

function getInput(container: HTMLElement) {
	return getSlot<HTMLInputElement>(container, 'input')
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

	it.each(['sm', 'md', 'lg'] as const)(
		'puts the badges in a slot one step below control size %s',
		(controlSize) => {
			const { container } = renderUI(<TagInput size={controlSize} defaultValue={['react']} />)

			// The slot is a relative scope: CSS steps it one below the scope above it
			// (`browser/density-scope.test.tsx` checks the computed step).
			const slot = present(getBadges(container)[0]?.closest('[data-density]'), 'slot')

			expect(slot).toHaveAttribute('data-density', 'slot')

			expect(slot.parentElement?.closest('[data-density]')).toHaveAttribute(
				'data-density',
				controlSize,
			)
		},
	)

	it('puts the badges in a slot under no explicit scope when size is omitted', () => {
		const { container } = renderUI(<TagInput defaultValue={['react']} />)

		const slot = present(getBadges(container)[0]?.closest('[data-density]'), 'slot')

		expect(slot).toHaveAttribute('data-density', 'slot')

		expect(slot.parentElement?.closest('[data-density]')).toBeNull()
	})

	it.each([
		['Enter', 'react{Enter}', 'react'],
		['comma', 'vue,', 'vue'],
	])('adds a tag on %s', async (_name, typed, tag) => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const user = setupUser()

		await user.type(getInput(container), typed)

		expect(onChange).toHaveBeenCalledWith([tag])
	})

	it('adds a tag on blur', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const user = setupUser()

		await user.type(getInput(container), 'svelte')

		await user.tab()

		expect(onChange).toHaveBeenCalledWith(['svelte'])
	})

	it('does not add duplicate tags', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react']} onValueChange={onChange} />)

		const input = getInput(container)

		const user = setupUser()

		await user.type(input, 'react{Enter}')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('removes a tag via its remove button', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react', 'vue']} onValueChange={onChange} />,
		)

		const user = setupUser()

		const removeButtons = getRemoveButtons(container)

		expect(removeButtons.length).toBe(2)

		await user.click(removeButtons[0] as Element)

		expect(onChange).toHaveBeenCalledWith(['vue'])
	})

	it('returns focus to the input after removing a tag via its badge', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = setupUser()

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

		const user = setupUser()

		await user.click(getRemoveButtons(container)[0] as Element)

		expect(document.activeElement).toBe(getInput(container))

		expect(getInput(container)).not.toHaveAttribute('readonly')
	})

	it('makes the remove button the one Tab stop of each tag', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const badges = getBadges(container)

		expect(badges.length).toBe(2)

		// The listitem has no name and no action, so it must not take focus.
		for (const badge of badges) {
			expect(badge).not.toHaveAttribute('tabindex')
		}

		const user = setupUser()

		await user.tab()

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove react' }))

		await user.tab()

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove vue' }))
	})

	it.each([
		['Backspace', 0, ['vue']],
		['Delete', 1, ['react']],
	])('removes the focused tag on %s', async (key, index, expected) => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput defaultValue={['react', 'vue']} onValueChange={onChange} />,
		)

		const user = setupUser()

		getRemoveButtons(container)[index]?.focus()

		await user.keyboard(`{${key}}`)

		expect(onChange).toHaveBeenCalledWith(expected)
	})

	it('leaves the focused tag in place on keys other than activation and removal', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput defaultValue={['react']} onValueChange={onChange} />)

		const user = setupUser()

		getRemoveButtons(container)[0]?.focus()

		await user.keyboard('{ArrowLeft}')

		await user.keyboard('a')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('returns focus to the input after removing the focused tag with Backspace', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = setupUser()

		getRemoveButtons(container)[0]?.focus()

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

		const user = setupUser()

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
		// isn't grayed and the tags stay removable; the Add button is disabled.
		expect(input).toHaveAttribute('readonly')

		expect(input).not.toBeDisabled()

		const addButton = present<HTMLButtonElement>(
			getSlot(container, 'suffix').querySelector('button'),
			'button',
		)

		expect(addButton).toBeDisabled()

		const user = setupUser()

		await user.click(getRemoveButtons(container)[0] as Element)

		expect(onChange).toHaveBeenCalledWith(['b'])
	})

	it('respects validate function', async () => {
		const onChange = vi.fn()

		const validate = (tag: string) => tag.length >= 2

		const { container } = renderUI(<TagInput validate={validate} onValueChange={onChange} />)

		const input = getInput(container)

		const user = setupUser()

		await user.type(input, 'x{Enter}')

		expect(onChange).not.toHaveBeenCalled()

		await user.clear(input)

		await user.type(input, 'ok{Enter}')

		expect(onChange).toHaveBeenCalledWith(['ok'])
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

	it('exposes the tags as an enumerable list', () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const list = getSlot(container, 'tags')

		expect(list).toHaveAttribute('role', 'list')

		expect(list).toHaveAttribute('aria-label', 'Tags')

		expect(list.querySelectorAll('[role="listitem"]')).toHaveLength(2)
	})

	it('keeps the tag list to phrasing content inside the span frame', () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		// The list sits in the prefix `<span>` of the ControlFrame `<span>`.
		expect(getSlot(container, 'tags').tagName).toBe('SPAN')

		expect(getSlot(container, 'control-frame').querySelector('div')).toBeNull()
	})

	it.each([
		['derived from placeholder', 'Add tags...', 'Add tags...'],
		['defaulted when no placeholder', undefined, 'Add tags'],
	])('has an aria-label on the input %s', (_name, placeholder, label) => {
		const { container } = renderUI(<TagInput placeholder={placeholder} />)

		expect(getInput(container)).toHaveAttribute('aria-label', label)
	})

	it('adds a tag when the suffix Add button is clicked', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<TagInput onValueChange={onChange} />)

		const input = getInput(container)

		const user = setupUser()

		await user.type(input, 'svelte')

		const addButton = present<HTMLButtonElement>(
			getSlot(container, 'suffix').querySelector('button'),
			'button',
		)

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
		const user = setupUser()

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
		// observed mutation — the read has to come after that tick, which is the wait this helper holds.
		await expectAnnouncement('Added 3 tags')

		// And ONE message, not three: the count replaces what would have been a per-tag stream.
		expect(liveRegion()).not.toHaveTextContent('Added 77002')
	})
})

describe('TagInput multi-token draft', () => {
	it('commits every token when the Add button takes a multi-token draft', async () => {
		const user = setupUser()

		const { container } = renderUI(<TagInput placeholder="Zip" />)

		await user.type(getInput(container), '77002 77003')

		// The button was enabled for a multi-token draft and did nothing when pressed, because it called
		// a single-tag path. Every commit channel now routes through the same tokenizer.
		await user.click(screen.getByRole('button', { name: 'Add tag' }))

		expect(getBadges(container).map((badge) => badge.textContent)).toEqual(['77002', '77003'])
	})

	it('commits every token in a multi-token draft on Enter', async () => {
		const user = setupUser()

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

		const user = setupUser()

		await user.type(getInput(container), typed)

		expect(liveRegion()).toHaveTextContent(announcement)
	})

	it('announces a removed tag', async () => {
		const { container } = renderUI(<TagInput defaultValue={['react', 'vue']} />)

		const user = setupUser()

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

		const user = setupUser()

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

describe('TagInput + Form reset', () => {
	it('drops the typed draft on a Form reset, so a later blur commits nothing', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ topics: ['react'] }} onSubmit={onSubmit}>
				<TagInput name="topics" />
				<button type="reset">Reset</button>
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = setupUser()

		await user.type(getInput(container), 'vue')

		// A reset from code keeps the focus in the field. A pointer press on the
		// reset button would blur the field first and commit the draft.
		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(getInput(container)).toHaveValue('')

		fireEvent.blur(getInput(container))

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ topics: ['react'] }),
			expect.anything(),
		)
	})

	it('drops the refused mark on a Form reset', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ topics: [] as string[] }}>
				<TagInput name="topics" validate={(tag) => tag !== 'bad'} />
				<button type="reset">Reset</button>
			</Form>,
		)

		const user = setupUser()

		await user.type(getInput(container), 'bad{Enter}')

		expect(getInput(container)).toHaveAttribute('aria-invalid', 'true')

		await user.click(screen.getByRole('button', { name: 'Reset' }))

		expect(getInput(container)).toHaveValue('')

		expect(getInput(container)).not.toHaveAttribute('aria-invalid')
	})
})

// B04-C11: the consumer handlers compose with the field's own handlers.
describe('TagInput consumer handlers', () => {
	it('runs a consumer onKeyDown, onPaste, and onBlur beside its own', () => {
		const onKeyDown = vi.fn()

		const onPaste = vi.fn()

		const onBlur = vi.fn()

		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput onKeyDown={onKeyDown} onPaste={onPaste} onBlur={onBlur} onValueChange={onChange} />,
		)

		const input = getInput(container)

		fireEvent.change(input, { target: { value: 'react' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		paste(input, 'vue,solid')

		fireEvent.change(input, { target: { value: 'lit' } })

		fireEvent.blur(input)

		expect(onKeyDown).toHaveBeenCalledTimes(1)

		expect(onPaste).toHaveBeenCalledTimes(1)

		expect(onBlur).toHaveBeenCalledTimes(1)

		expect(onChange).toHaveBeenLastCalledWith(['react', 'vue', 'solid', 'lit'])
	})

	it('skips the Enter commit when the consumer onKeyDown prevents the default', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<TagInput
				onKeyDown={(event) => {
					if (event.key === 'Enter') event.preventDefault()
				}}
				onValueChange={onChange}
			/>,
		)

		const input = getInput(container)

		fireEvent.change(input, { target: { value: 'react' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange).not.toHaveBeenCalled()
	})
})

// B04-C12: an enclosing Control's `disabled` or `readOnly` locks the tags.
describe('TagInput ambient state', () => {
	it.each([
		['disabled', { disabled: true }],
		['read-only', { readOnly: true }],
	])('keeps the tags and refuses new ones under a %s Control', (_, lock) => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Control {...lock}>
				<TagInput defaultValue={['react']} onValueChange={onChange} />
			</Control>,
		)

		const input = getInput(container)

		expect(getRemoveButtons(container)).toHaveLength(0)

		fireEvent.keyDown(input, { key: 'Backspace' })

		fireEvent.keyDown(getBadges(container)[0] as HTMLElement, { key: 'Backspace' })

		paste(input, 'vue,solid')

		fireEvent.blur(input)

		expect(onChange).not.toHaveBeenCalled()

		expect(getBadges(container).map((badge) => badge.textContent)).toEqual(['react'])

		expect(screen.getByRole('button', { name: 'Add tag' })).toBeDisabled()
	})
})
