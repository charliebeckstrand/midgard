import { describe, expect, it } from 'vitest'
import { isProseDefault } from '../../../components/api-reference/default-value'
import { readSignature } from '../../../components/api-reference/prop-facts'
import { PropList } from '../../../components/api-reference/prop-list'
import { renderUI, screen } from '../../helpers'

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

describe('readSignature', () => {
	it('reads a union of literals as options', () => {
		expect(readSignature("'left' | 'right'")).toEqual({
			options: ["'left'", "'right'"],
			others: [],
		})
	})

	it('keeps a plain type as one plain name', () => {
		expect(readSignature('boolean')).toEqual({ options: [], others: ['boolean'] })
	})

	it('keeps plain arms beside the options', () => {
		expect(readSignature("'a' | 'b' | null")).toEqual({ options: ["'a'", "'b'"], others: ['null'] })
	})

	it('treats a lone literal as a plain name', () => {
		expect(readSignature("'a' | number")).toEqual({ options: [], others: ["'a'", 'number'] })
	})
})

describe('PropList', () => {
	it('marks a prop optional or required', () => {
		renderUI(
			<PropList
				rows={[
					{ name: 'open', type: 'boolean', required: true },
					{ name: 'modal', type: 'boolean' },
				]}
			/>,
		)

		expect(screen.getByText('required')).toBeInTheDocument()

		expect(screen.getByText('optional')).toBeInTheDocument()
	})

	it('marks the default inside its option chip', () => {
		const { container } = renderUI(
			<PropList rows={[{ name: 'align', type: "'center' | 'top'", default: "'center'" }]} />,
		)

		const options = [...container.querySelectorAll('[data-slot="option"]')]

		expect(options.map((o) => o.textContent)).toEqual(["'center'default", "'top'"])

		expect(container.textContent).not.toContain('One of')

		expect(container.textContent?.match(/'center'/g)).toHaveLength(1)
	})

	it('labels a default that is not an option', () => {
		const { container } = renderUI(
			<PropList rows={[{ name: 'size', type: "'sm' | 'md' | number", default: '4' }]} />,
		)

		expect(container.textContent).toContain('default 4')
	})

	it('writes a plain type and its default', () => {
		const { container } = renderUI(
			<PropList rows={[{ name: 'modal', type: 'boolean', default: 'true' }]} />,
		)

		expect(container.textContent).toContain('booleandefault true')
	})

	it('names the package of an external type', () => {
		const { container } = renderUI(
			<PropList rows={[{ name: 'ref', type: 'Placement', externalFrom: '@floating-ui/react' }]} />,
		)

		expect(container.textContent).toContain('Placementfrom @floating-ui/react')
	})

	it('moves a prose default into the description', () => {
		const { container } = renderUI(
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

		expect(container.textContent).toContain('Default: the document.body node')

		expect(container.textContent).not.toContain('default')
	})
})
