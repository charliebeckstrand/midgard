import { describe, expect, it } from 'vitest'
import { isProseDefault } from '../../../components/api-reference/default-value'
import { splitDescription } from '../../../components/api-reference/doc-description'
import { PropList } from '../../../components/api-reference/prop-list'
import { readSignature } from '../../../components/api-reference/prop-signature'
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

	it('marks the default option in a union of literals', () => {
		renderUI(<PropList rows={[{ name: 'align', type: "'center' | 'top'", default: "'center'" }]} />)

		// The default is one of the options, so it marks that option.
		expect(screen.getByText('default')).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument()
	})

	it('shows a default outside the options as a labelled value', () => {
		renderUI(<PropList rows={[{ name: 'modal', type: 'boolean', default: 'true' }]} />)

		expect(screen.getByText(/default/)).toHaveTextContent('default true')
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

		expect(screen.queryByText(/default/i)).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Read more' }))

		expect(screen.getByText(/Default:/)).toBeInTheDocument()
	})
})

describe('readSignature', () => {
	it('splits a string union into its primitive and its options', () => {
		expect(readSignature({ name: 'side', type: "'left' | 'right'" })).toEqual({
			kind: ['string'],
			options: ["'left'", "'right'"],
		})
	})

	it('keeps a plain type as a kind with no options', () => {
		expect(readSignature({ name: 'open', type: 'boolean' })).toEqual({
			kind: ['boolean'],
			options: [],
		})
	})

	it('keeps non-literal arms beside the options', () => {
		expect(readSignature({ name: 'gap', type: "'auto' | number | null" })).toEqual({
			kind: ['string', 'number', 'null'],
			options: [],
		})
	})

	it('defers to TypeCell for a type with references', () => {
		expect(readSignature({ name: 'x', type: 'Foo', references: { Foo: 'string' } })).toBeNull()
	})
})
