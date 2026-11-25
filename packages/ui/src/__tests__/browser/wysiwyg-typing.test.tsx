import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { Wysiwyg, type WysiwygHandle, WysiwygToolbar } from '../../modules/wysiwyg'
import { getSlot, present, renderUI, screen, waitFor } from '../helpers'
import { editable } from './helpers/wysiwyg'

/** A field that shows its Markdown value. */
function Notes({ initial = '', onEnter }: { initial?: string; onEnter?: () => void }) {
	const [value, setValue] = useState(initial)

	return (
		<>
			<Wysiwyg
				aria-label="Notes"
				value={value}
				onValueChange={setValue}
				onEnter={onEnter}
				rows={1}
				className="max-h-24"
			>
				<WysiwygToolbar />
			</Wysiwyg>
			<output data-testid="value">{value}</output>
		</>
	)
}

const value = () => screen.getByTestId('value').textContent

/**
 * The editing of a Wysiwyg in a real browser: the live Markdown shortcuts, the
 * toolbar that keeps the selection, undo, and the growth to a `max-height`.
 * jsdom has no selection and no layout, so these ride the browser.
 */
describe('Wysiwyg (real browser)', () => {
	it('turns the Markdown shortcuts into formatting as the reader types', async () => {
		renderUI(<Notes />)

		const field = await editable()

		await userEvent.keyboard('A **bold** and *em* word{Enter}- one{Enter}two')

		expect(field.querySelector('strong')).toHaveTextContent('bold')

		expect(field.querySelector('em')).toHaveTextContent('em')

		expect(field.querySelectorAll('li')).toHaveLength(2)

		expect(value()).toBe('A **bold** and *em* word\n\n- one\n- two')
	})

	it('keeps the emphasis characters of a code span that the reader types as code', async () => {
		renderUI(<Notes />)

		const field = await editable()

		await userEvent.keyboard('Run `2*3*4` and `a **b**` now')

		expect([...field.querySelectorAll('code')].map((code) => code.textContent)).toEqual([
			'2*3*4',
			'a **b**',
		])

		expect(field.querySelector('em, strong')).toBeNull()

		expect(value()).toBe('Run `2*3*4` and `a **b**` now')
	})

	it('makes emphasis after a backtick that no later backtick closes', async () => {
		renderUI(<Notes />)

		const field = await editable()

		await userEvent.keyboard('Press the ` key to **open** it')

		expect(field.querySelector('strong')).toHaveTextContent('open')

		expect(field.querySelector('code')).toBeNull()

		expect(value()).toBe('Press the \\` key to **open** it')
	})

	it('starts a new block on Shift+Enter when Enter sends, so the shortcuts work', async () => {
		const onEnter = vi.fn()

		renderUI(<Notes onEnter={onEnter} />)

		const field = await editable()

		await userEvent.keyboard('Steps{Shift>}{Enter}{/Shift}- one{Shift>}{Enter}{/Shift}two{Enter}')

		expect(field.querySelectorAll('li')).toHaveLength(2)

		expect(value()).toBe('Steps\n\n- one\n- two')

		expect(onEnter).toHaveBeenCalledTimes(1)
	})

	it('shows the caret in a new, empty code block from the toolbar', async () => {
		renderUI(<Notes />)

		const field = await editable()

		await userEvent.click(screen.getByRole('button', { name: 'Code block' }))

		expect(field).toHaveFocus()

		const pre = present(field.querySelector('pre'), 'the code block')

		expect(pre.contains(window.getSelection()?.anchorNode ?? null)).toBe(true)

		// In a flex row, the empty code has no width, and the browser draws no caret.
		expect(getComputedStyle(pre).display).toBe('block')
	})

	it.for([
		{ name: 'Enter', onEnter: undefined, key: '{Enter}' },
		{ name: 'Shift+Enter when Enter sends', onEnter: vi.fn(), key: '{Shift>}{Enter}{/Shift}' },
	])('leaves a code block on $name on an empty last line', async ({ onEnter, key }) => {
		renderUI(<Notes onEnter={onEnter} />)

		const field = await editable()

		await userEvent.keyboard(`\`\`\` x${key}${key}after`)

		expect(field.querySelector('pre')).toHaveTextContent(/^x$/)

		expect(field.querySelector('pre + p')).toHaveTextContent('after')

		expect(value()).toBe('```\nx\n```\n\nafter')

		expect(onEnter ?? vi.fn()).not.toHaveBeenCalled()
	})

	it('leaves the last code block on ArrowDown from its last line', async () => {
		renderUI(<Notes />)

		const field = await editable()

		await userEvent.keyboard('``` one{Enter}two{ArrowUp}{ArrowDown}{ArrowDown}after')

		expect(field.querySelector('pre + p')).toHaveTextContent('after')

		expect(value()).toBe('```\none\ntwo\n```\n\nafter')
	})

	it('keeps the controlled value, and starts a new undo history, when the parent refuses an edit', async () => {
		function Capped() {
			const [value, setValue] = useState('')

			// The parent takes at most ten characters.
			return (
				<Wysiwyg
					aria-label="Notes"
					value={value}
					onValueChange={(next) => setValue(next.slice(0, 10))}
				/>
			)
		}

		renderUI(<Capped />)

		const field = await editable()

		await userEvent.keyboard('Helloabcdef')

		expect(field).toHaveTextContent(/^Helloabcde$/)

		// The parent refused the last key and set its value. The edits before it
		// are out of the new history, so an undo leaves the value as it is.
		await userEvent.keyboard('{Control>}z{/Control}')

		expect(field).toHaveTextContent(/^Helloabcde$/)
	})

	it('starts a new undo history when the parent sets the value', async () => {
		function Loader() {
			const [value, setValue] = useState('')

			return (
				<>
					<Wysiwyg aria-label="Notes" value={value} onValueChange={setValue} />
					<button type="button" onClick={() => setValue('Fresh')}>
						Load
					</button>
					<output data-testid="value">{value}</output>
				</>
			)
		}

		renderUI(<Loader />)

		const field = await editable()

		await userEvent.keyboard('First{Enter}Second{Control>}a{/Control}{Backspace}')

		await userEvent.click(screen.getByRole('button', { name: 'Load' }))

		await userEvent.click(field)

		await userEvent.keyboard('{Control>}z{/Control}{Control>}z{/Control}')

		expect(field).toHaveTextContent(/^Fresh$/)

		expect(value()).toBe('Fresh')
	})

	it('gives the ranges of the default value on a form reset, and not those of the last edit', async () => {
		const source = 'Ask @Sales'

		const given = { id: 'sales', start: 4, end: 10, quote: '@Sales' }

		const changes: unknown[] = []

		function Reset() {
			const [ranges, setRanges] = useState([given])

			return (
				<form>
					<Wysiwyg
						aria-label="Notes"
						defaultValue={source}
						ranges={ranges}
						onValueChange={(next, kept) => {
							changes.push([next, kept])

							setRanges(kept)
						}}
					/>
				</form>
			)
		}

		renderUI(<Reset />)

		const field = await editable()

		await userEvent.keyboard('{Home}Please ')

		await waitFor(() =>
			expect(changes.at(-1)).toEqual([`Please ${source}`, [{ ...given, start: 11, end: 17 }]]),
		)

		field.closest('form')?.reset()

		await waitFor(() => expect(changes.at(-1)).toEqual([source, [given]]))

		await waitFor(() =>
			expect(field.querySelector('[data-slot="wysiwyg-range"]')).toHaveTextContent('@Sales'),
		)
	})

	it('formats the selection from the toolbar and keeps the focus in the field', async () => {
		renderUI(<Notes initial="Ship it" />)

		const field = await editable()

		await userEvent.keyboard('{Control>}a{/Control}')

		const bold = screen.getByRole('button', { name: 'Bold' })

		await userEvent.click(bold)

		expect(field).toHaveFocus()

		expect(bold).toHaveAttribute('aria-pressed', 'true')

		expect(value()).toBe('**Ship it**')

		await userEvent.keyboard('{Control>}z{/Control}')

		expect(value()).toBe('Ship it')
	})

	it('links the selected text from the link dialog, and keeps it selected', async () => {
		renderUI(<Notes initial="Ship it" />)

		const field = await editable()

		await userEvent.keyboard('{End}{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}')

		await userEvent.click(screen.getByRole('button', { name: 'Link' }))

		const dialog = await screen.findByRole('dialog', { name: 'Link' })

		const url = screen.getByRole('textbox', { name: 'URL' })

		await waitFor(() => expect(url).toHaveFocus())

		expect(screen.getByRole('textbox', { name: 'Text' })).toHaveValue('it')

		// The field marks the selection while the focus is in the dialog.
		expect(field.querySelector('[data-slot=wysiwyg-held]')).toHaveTextContent('it')

		expect(dialog).toBeVisible()

		await userEvent.keyboard('https://a.dev{Enter}')

		expect(value()).toBe('Ship [it](https://a.dev)')

		await waitFor(() => expect(field).toHaveFocus())

		expect(window.getSelection()?.toString()).toBe('it')

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toBeNull()
	})

	it('links new text in place of the whole doc after Mod+A', async () => {
		renderUI(<Notes initial="hello" />)

		const field = await editable()

		await userEvent.keyboard('{Control>}a{/Control}{Control>}k{/Control}')

		const url = await screen.findByRole('textbox', { name: 'URL' })

		await waitFor(() => expect(url).toHaveFocus())

		await userEvent.fill(screen.getByRole('textbox', { name: 'Text' }), 'hi')

		await userEvent.fill(url, 'https://a.dev')

		await userEvent.keyboard('{Enter}')

		expect(value()).toBe('[hi](https://a.dev)')

		await waitFor(() => expect(field).toHaveFocus())

		expect(window.getSelection()?.toString()).toBe('hi')
	})

	it('puts the text and the link in at the caret from the link dialog', async () => {
		renderUI(<Notes initial="Ship " />)

		const field = await editable()

		await userEvent.keyboard('{End}')

		await userEvent.click(screen.getByRole('button', { name: 'Link' }))

		const text = await screen.findByRole('textbox', { name: 'Text' })

		await waitFor(() => expect(text).toHaveFocus())

		expect(field.querySelector('[data-slot=wysiwyg-held-caret]')).not.toBeNull()

		await userEvent.keyboard('the docs{Tab}https://a.dev{Enter}')

		expect(value()).toBe('Ship [the docs](https://a.dev)')

		await waitFor(() => expect(field).toHaveFocus())

		await userEvent.keyboard(' now')

		expect(value()).toBe('Ship [the docs](https://a.dev) now')
	})

	it('is inert while read-only: a press shows no action as on, and no shortcut edits', async () => {
		const onValueChange = vi.fn()

		renderUI(
			<Wysiwyg
				aria-label="Notes"
				defaultValue="**Bold** text"
				readOnly
				onValueChange={onValueChange}
			>
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const field = await editable()

		await userEvent.tripleClick(present(field.querySelector('strong'), 'the bold text'))

		await userEvent.keyboard('{Control>}b{/Control}')

		expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false')

		expect(field.querySelector('strong')).not.toBeNull()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('lets the reader select the text of a read-only field with the pointer', async () => {
		renderUI(<Wysiwyg aria-label="Notes" defaultValue="Some **bold** and *italic* text" readOnly />)

		const field = await editable()

		await userEvent.dragAndDrop(
			present(field.querySelector('strong'), 'the bold text'),
			present(field.querySelector('em'), 'the italic text'),
		)

		expect(window.getSelection()?.toString()).toContain('and')
	})

	it.for([false, true])(
		'shows not-allowed over each part of a disabled field (separated: %s)',
		async (separated) => {
			const { container } = renderUI(
				<Wysiwyg aria-label="Notes" defaultValue="Text" disabled separated={separated}>
					<WysiwygToolbar />
				</Wysiwyg>,
			)

			const parts = [
				getSlot(container, 'control-frame'),
				screen.getByRole('textbox'),
				screen.getByRole('toolbar'),
				screen.getByRole('button', { name: 'Bold' }),
			]

			expect(parts.map((part) => getComputedStyle(part).cursor)).toEqual(
				parts.map(() => 'not-allowed'),
			)
		},
	)

	it('skips the toolbar of a read-only field on Tab, and shows no tooltip', async () => {
		renderUI(
			<>
				<button type="button">Before</button>
				<Wysiwyg aria-label="Notes" defaultValue="Text" readOnly separated>
					<WysiwygToolbar />
				</Wysiwyg>
			</>,
		)

		screen.getByRole('button', { name: 'Before' }).focus()

		await userEvent.tab()

		expect(screen.getByRole('textbox')).toHaveFocus()

		expect(document.querySelector('[role=tooltip]')).toBeNull()
	})

	it('replaces text of the block of the caret from the handle, as one undo step', async () => {
		type Source = MarkdownRange & { target: string }

		const ref = createRef<WysiwygHandle<Source>>()

		const onValueChange = vi.fn()

		const onSelectionChange = vi.fn()

		renderUI(
			<Wysiwyg
				ref={ref}
				aria-label="Notes"
				onValueChange={onValueChange}
				onSelectionChange={onSelectionChange}
			/>,
		)

		const field = await editable()

		// The block is plain text: the bold shows no syntax in it.
		await userEvent.keyboard('Ask **bold** @Sa')

		expect(onSelectionChange).toHaveBeenLastCalledWith({
			text: 'Ask bold @Sa',
			caret: 12,
			ranges: [],
		})

		ref.current?.replace(9, 12, '@Sales ', {
			id: 'c1',
			start: 9,
			end: 15,
			quote: '@Sales',
			target: 'sales',
		})

		// The value gives the range back with the offsets of the Markdown source.
		expect(onValueChange).toHaveBeenLastCalledWith('Ask **bold** @Sales ', [
			{ id: 'c1', start: 13, end: 19, quote: '@Sales', target: 'sales' },
		])

		expect(onSelectionChange).toHaveBeenLastCalledWith({
			text: 'Ask bold @Sales ',
			caret: 16,
			ranges: [{ id: 'c1', start: 9, end: 15 }],
		})

		expect(
			present(field.querySelector('[data-slot="wysiwyg-range"]'), 'the range'),
		).toHaveTextContent('@Sales')

		// The undo takes back the replace, and not the text typed before it.
		await userEvent.keyboard('{Control>}z{/Control}')

		expect(field).toHaveTextContent('Ask bold @Sa')

		expect(field.querySelector('[data-slot="wysiwyg-range"]')).toBeNull()
	})

	it('paints the formatting and the layout of the editor before the editor loads', async () => {
		const source = [
			'## Plan',
			'A **bold**, *em*, ~~old~~, `code`, and [link](https://example.com) line\\\nwith a break and @Sales.',
			'- one\n- two',
			'3. three\n4. four',
			'> a quote',
			'```ts\nconst a = 1\n\n```',
			'___',
			'| a |\n| --- |\n| b |',
			'An ![image](https://example.com/a.png) inline',
		].join('\n\n')

		const sales = {
			id: 'sales',
			start: source.indexOf('@Sales'),
			end: source.indexOf('@Sales') + 6,
			quote: '@Sales',
		}

		renderUI(<Wysiwyg aria-label="Notes" defaultValue={source} ranges={[sales]} />)

		const field = screen.getByRole('textbox')

		// The markup of the first paint, before the editor loads.
		expect(field).not.toHaveClass('ProseMirror')

		const layout = (element: HTMLElement) =>
			[...element.children].map((block) => {
				const { top, height } = block.getBoundingClientRect()

				return [block.tagName, top, height, block.textContent]
			})

		const before = layout(field)

		expect(field.querySelector('strong')).toHaveTextContent('bold')

		expect(field.querySelector('[data-slot="wysiwyg-range"]')).toHaveTextContent('@Sales')

		const editor = await editable()

		expect(layout(editor)).toEqual(before)
	})

	it('grows with its content up to the max height, and then scrolls', async () => {
		renderUI(<Notes />)

		const field = await editable()

		const empty = field.getBoundingClientRect().height

		await userEvent.keyboard('One{Enter}Two{Enter}Three{Enter}Four')

		const grown = field.getBoundingClientRect().height

		expect(grown).toBeGreaterThan(empty)

		await userEvent.keyboard('{Enter}Five{Enter}Six{Enter}Seven{Enter}Eight{Enter}Nine')

		// `max-h-24` is 96 px.
		expect(field.getBoundingClientRect().height).toBeLessThanOrEqual(96)

		expect(field.scrollHeight).toBeGreaterThan(field.clientHeight)
	})
})
