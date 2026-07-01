import { describe, expect, it, vi } from 'vitest'
import { Markdown } from '../../components/markdown'
import { bySlot, renderUI, waitFor } from '../helpers'

vi.mock('shiki', () => ({
	codeToHtml: vi.fn(
		async (code: string, options: { lang: string }) =>
			`<pre class="shiki" data-lang="${options.lang}"><code>${code}</code></pre>`,
	),
}))

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

	it('styles each element directly instead of projecting from the wrapper', () => {
		const { container } = renderUI(<Markdown>{'# Title'}</Markdown>)

		const el = bySlot(container, 'markdown')

		// The heading carries its own type-scale class...
		expect(el?.querySelector('h1')).toHaveClass('text-xl')

		// ...and the wrapper no longer pours descendant-projection utilities
		// (`[&_h1]:…`) into its own class attribute.
		expect(el?.className).not.toMatch(/\[&_/)
	})

	it('renders inline mode into a span without block wrapping', () => {
		const { container } = renderUI(<Markdown inline>{'Some **bold** text'}</Markdown>)

		const el = bySlot(container, 'markdown')

		expect(el?.tagName).toBe('SPAN')

		expect(el?.querySelector('strong')?.textContent).toBe('bold')

		expect(el?.querySelector('p')).toBeNull()
	})

	it('renders GFM task lists with a disabled checkbox', () => {
		const { container } = renderUI(<Markdown>{'- [x] done\n- [ ] todo'}</Markdown>)

		const boxes = bySlot(container, 'markdown')?.querySelectorAll('input[type="checkbox"]')

		expect(boxes).toHaveLength(2)

		expect((boxes?.[0] as HTMLInputElement).checked).toBe(true)

		expect((boxes?.[1] as HTMLInputElement).checked).toBe(false)

		expect(boxes?.[0]).toBeDisabled()
	})

	it('renders GFM tables', () => {
		const { container } = renderUI(<Markdown>{'| a | b |\n|---|---|\n| 1 | 2 |'}</Markdown>)

		const el = bySlot(container, 'markdown')

		expect(el?.querySelectorAll('th')).toHaveLength(2)

		expect(el?.querySelector('tbody td')?.textContent).toBe('1')
	})

	it('drops raw HTML in the source instead of injecting it', () => {
		const { container } = renderUI(
			<Markdown>{'<script>alert(1)</script>\n\nSafe **text**.'}</Markdown>,
		)

		const el = bySlot(container, 'markdown')

		expect(el?.querySelector('script')).toBeNull()

		// Surrounding Markdown still renders.
		expect(el?.querySelector('strong')?.textContent).toBe('text')
	})

	it('renders inline code through the Code component', () => {
		const { container } = renderUI(<Markdown>{'Some `code`.'}</Markdown>)

		expect(bySlot(container, 'code')).toHaveTextContent('code')
	})

	it('renders a fenced code block through CodeBlock, resolving the language from the info string', async () => {
		const { container } = renderUI(<Markdown>{'```tsx\nconst x = 1\n```'}</Markdown>)

		expect(bySlot(container, 'code-block')).toBeInTheDocument()

		await waitFor(() =>
			expect(container.querySelector('pre.shiki')).toHaveAttribute('data-lang', 'tsx'),
		)
	})

	it('falls back to the text grammar for an unlabeled fence', async () => {
		const { container } = renderUI(<Markdown>{'```\nplain\n```'}</Markdown>)

		await waitFor(() =>
			expect(container.querySelector('pre.shiki')).toHaveAttribute('data-lang', 'text'),
		)
	})
})
