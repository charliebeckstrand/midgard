import { describe, expect, it } from 'vitest'
import { Markdown } from '../../components/markdown'
import { bySlot, renderUI } from '../helpers'

describe('Markdown', () => {
	it('renders parsed Markdown into a data-slot="markdown" div', () => {
		const { container } = renderUI(<Markdown>{'# Title'}</Markdown>)

		const el = bySlot(container, 'markdown')

		expect(el).toBeInTheDocument()
		expect(el?.tagName).toBe('DIV')
		expect(el?.querySelector('h1')?.textContent).toBe('Title')
	})

	it('renders inline emphasis, code, and links', () => {
		const md = 'Some **bold**, `code`, and a [link](https://example.com).'

		const { container } = renderUI(<Markdown>{md}</Markdown>)

		const el = bySlot(container, 'markdown')

		expect(el?.querySelector('strong')?.textContent).toBe('bold')
		expect(el?.querySelector('code')?.textContent).toBe('code')
		expect(el?.querySelector('a')).toHaveAttribute('href', 'https://example.com')
	})

	it('supports GitHub-flavored strikethrough', () => {
		const { container } = renderUI(<Markdown>{'~~gone~~'}</Markdown>)

		expect(bySlot(container, 'markdown')?.querySelector('del')?.textContent).toBe('gone')
	})

	it('merges a custom className with the prose base', () => {
		const { container } = renderUI(<Markdown className="custom-class">{'text'}</Markdown>)

		expect(bySlot(container, 'markdown')).toHaveClass('custom-class')
	})
})
