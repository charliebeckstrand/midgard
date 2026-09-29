import { describe, expect, it } from 'vitest'
import { isProseDefault } from '../../../components/api-reference/default-value'
import { splitDescription } from '../../../components/api-reference/doc-description'
import { PropList } from '../../../components/api-reference/prop-list'
import { fireEvent, renderUI, screen } from '../../helpers'

describe('splitDescription', () => {
	it('splits at the first blank line', () => {
		expect(splitDescription('Summary.\n\nOne.\n\nTwo.')).toEqual({
			summary: 'Summary.',
			detail: 'One.\n\nTwo.',
		})
	})

	it('keeps a single paragraph as the summary', () => {
		expect(splitDescription('Only one.')).toEqual({ summary: 'Only one.', detail: '' })
	})

	it('does not split a description that opens with a code fence', () => {
		const text = '```ts\na\n\nb\n```'

		expect(splitDescription(text)).toEqual({ summary: text, detail: '' })
	})
})

describe('isProseDefault', () => {
	it.each([
		['container `document.body`, with full-viewport `fixed` positioning', true],
		['See {@link Foo} for the rule', true],
		["'center'", false],
		['`document.body`', false],
		['{@link Foo}', false],
		["'a' | 'b'", false],
		['<TableEmptyAlert />', false],
	])('%s → %s', (value, expected) => {
		expect(isProseDefault(value)).toBe(expected)
	})
})

describe('PropList', () => {
	it('shows the summary and folds the rest behind a toggle', () => {
		renderUI(
			<PropList
				rows={[
					{ name: 'onOpenComplete', type: '() => void', description: 'Summary.\n\nMore detail.' },
				]}
			/>,
		)

		expect(screen.getByText('Summary.')).toBeInTheDocument()

		expect(screen.queryByText('More detail.')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Read more' }))

		expect(screen.getByText('More detail.')).toBeInTheDocument()
	})

	it('shows a literal default as a labelled line', () => {
		renderUI(<PropList rows={[{ name: 'align', type: "'center' | 'top'", default: "'center'" }]} />)

		expect(screen.getByText(/Default/)).toHaveTextContent("Default 'center'")

		expect(screen.queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument()
	})

	it('moves a prose default into the folded description', () => {
		renderUI(
			<PropList
				rows={[
					{
						name: 'container',
						type: 'HTMLElement',
						description: 'Element to portal into.',
						default: 'the `document.body` node',
					},
				]}
			/>,
		)

		expect(screen.queryByText(/Default/)).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Read more' }))

		expect(screen.getByText(/Default:/)).toBeInTheDocument()
	})
})
