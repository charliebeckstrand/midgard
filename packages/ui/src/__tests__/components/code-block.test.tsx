import { describe, expect, it, vi } from 'vitest'
import { CodeBlock } from '../../components/code/code-block'
import { loadShiki } from '../../components/code/code-shiki'
import { bySlot, renderUI, screen, tick, waitFor } from '../helpers'

// `shiki` is mocked globally in setup/module-mocks.ts; a per-file mock here
// would bleed across files (see markdown.test.tsx for the failure it caused).
// The `loadShiki` cases need their own registry, so they sit in
// boundary/code-block-load-shiki.test.ts, which runs on forks.

describe('CodeBlock', () => {
	it('renders with data-slot="code-block"', async () => {
		const { container } = renderUI(<CodeBlock code="const x = 1" />)

		const el = bySlot(container, 'code-block')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('applies custom className', async () => {
		const { container } = renderUI(<CodeBlock code="x" className="custom" />)

		expect(bySlot(container, 'code-block')?.className).toContain('custom')

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('renders a plain-text fallback before shiki has tokenized', async () => {
		const { container } = renderUI(<CodeBlock code="raw code" />)

		expect(screen.getByText('raw code')).toBeInTheDocument()

		// Flush the deferred shiki setHtml inside act before the test ends.
		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('renders a copy button by default', async () => {
		const { container } = renderUI(<CodeBlock code="x" />)

		expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument()

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('omits the copy button when copy is false', async () => {
		const { container } = renderUI(<CodeBlock code="x" copy={false} />)

		expect(screen.queryByLabelText('Copy to clipboard')).not.toBeInTheDocument()

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('trims leading and trailing whitespace from the input code', async () => {
		const { container } = renderUI(<CodeBlock code="   padded   " copy={false} />)

		expect(screen.getByText('padded')).toBeInTheDocument()

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('finishes a load that outlives its block, and reports nothing', async () => {
		const reported = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { unmount } = renderUI(<CodeBlock code="unique-unmount-token" />)

		// Tear the component down on the same tick, before shiki resolves.
		unmount()

		// The whole load chain runs after the unmount. One microtask ended the case
		// before any of it ran, so nothing the case read could change. The chain
		// waits on the memoized load first, and a worker's first import of shiki
		// takes more than one macrotask, so the case waits on that same load. One
		// macrotask then runs the highlight and the cache write behind it.
		await loadShiki()

		await tick()

		expect(reported).not.toHaveBeenCalled()

		expect(screen.queryByText('unique-unmount-token')).toBeNull()

		// The control that the chain did run: it filled the cache, so a second block
		// with the same code draws the highlighted markup on its first render.
		const { container } = renderUI(<CodeBlock code="unique-unmount-token" />)

		expect(container.querySelector('pre.shiki')).not.toBeNull()
	})

	it('never paints the markup of the code it showed before', async () => {
		const { container, rerender } = renderUI(<CodeBlock code="first-snippet-token" copy={false} />)

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())

		rerender(<CodeBlock code="second-snippet-token" copy={false} />)

		expect(screen.queryByText('first-snippet-token')).toBeNull()

		expect(screen.getByText('second-snippet-token')).toBeInTheDocument()

		await waitFor(() =>
			expect(container.querySelector('pre.shiki')?.textContent).toBe('second-snippet-token'),
		)
	})

	it('tokenizes streamed code one pass at a time, ending on the newest code', async () => {
		const { codeToHtml } = await loadShiki()

		const calls = vi.mocked(codeToHtml).mock.calls.length

		const { container, rerender } = renderUI(<CodeBlock code="stream-a" copy={false} />)

		for (const chunk of ['stream-ab', 'stream-abc', 'stream-abcd']) {
			rerender(<CodeBlock code={chunk} copy={false} />)
		}

		await waitFor(() =>
			expect(container.querySelector('pre.shiki')?.textContent).toBe('stream-abcd'),
		)

		const tokenized = vi
			.mocked(codeToHtml)
			.mock.calls.slice(calls)
			.map(([code]) => code)

		expect(tokenized).toEqual(['stream-a', 'stream-abcd'])
	})

	it('paints markup that another block cached while its own pass ran', async () => {
		const { codeToHtml } = await loadShiki()

		const settle: { first: () => void } = { first: () => {} }

		// Hold the first pass of block A, so that block B tokenizes the newest code
		// and fills the cache before that pass settles.
		vi.mocked(codeToHtml).mockImplementationOnce(
			(code: string) =>
				new Promise((resolve) => {
					settle.first = () => resolve(`<pre class="shiki"><code>${code}</code></pre>`)
				}),
		)

		const a = renderUI(<CodeBlock code="race-a" copy={false} />)

		await waitFor(() =>
			expect(vi.mocked(codeToHtml)).toHaveBeenLastCalledWith('race-a', expect.anything()),
		)

		a.rerender(<CodeBlock code="race-ab" copy={false} />)

		const b = renderUI(<CodeBlock code="race-ab" copy={false} />)

		await waitFor(() => expect(b.container.querySelector('pre.shiki')).toBeInTheDocument())

		settle.first()

		await waitFor(() => expect(a.container.querySelector('pre.shiki')?.textContent).toBe('race-ab'))
	})

	it('keeps the code left to right under a right-to-left ancestor', async () => {
		const { container } = renderUI(
			<div dir="rtl">
				<CodeBlock code="const rtl = 1" copy={false} />
			</div>,
		)

		const pre = container.querySelector('pre')

		expect(pre?.closest('[dir]')).toHaveAttribute('dir', 'ltr')

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())

		expect(container.querySelector('pre.shiki')?.closest('[dir]')).toHaveAttribute('dir', 'ltr')
	})
})
