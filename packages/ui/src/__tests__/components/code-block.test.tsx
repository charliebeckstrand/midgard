import { describe, expect, it, vi } from 'vitest'
import { CodeBlock } from '../../components/code/code-block'
import { bySlot, renderUI, screen, waitFor } from '../helpers'

vi.mock('shiki', () => ({
	codeToHtml: vi.fn(async (code: string) => `<pre class="shiki"><code>${code}</code></pre>`),
}))

describe('CodeBlock', () => {
	it('renders with data-slot="code-block"', () => {
		const { container } = renderUI(<CodeBlock code="const x = 1" />)

		const el = bySlot(container, 'code-block')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<CodeBlock code="x" className="custom" />)

		expect(bySlot(container, 'code-block')?.className).toContain('custom')
	})

	it('renders a plain-text fallback before shiki has tokenised', () => {
		renderUI(<CodeBlock code="raw code" />)

		expect(screen.getByText('raw code')).toBeInTheDocument()
	})

	it('renders a copy button by default', () => {
		renderUI(<CodeBlock code="x" />)

		expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument()
	})

	it('omits the copy button when copy is false', () => {
		renderUI(<CodeBlock code="x" copy={false} />)

		expect(screen.queryByLabelText('Copy to clipboard')).not.toBeInTheDocument()
	})

	it('renders the highlighted html once shiki resolves', async () => {
		const { container } = renderUI(<CodeBlock code="const x = 1" />)

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('trims leading and trailing whitespace from the input code', () => {
		renderUI(<CodeBlock code="   padded   " copy={false} />)

		expect(screen.getByText('padded')).toBeInTheDocument()
	})
})
