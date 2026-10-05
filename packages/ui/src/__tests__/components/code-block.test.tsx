import { Profiler, type ReactElement, useLayoutEffect } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import type { CodeBlockVariants } from '../../components/code'
import { CodeBlock, primeCodeBlock } from '../../components/code/code-block'
import {
	act,
	attach,
	bySlot,
	densityStepOf,
	expectAnnouncement,
	fireEvent,
	getSlot,
	present,
	renderUI,
	screen,
	tick,
	waitFor,
} from '../helpers'
import { highlight } from '../mocks/shiki'

// The worker port of `CodeBlock` is mocked globally in setup/module-mocks.ts,
// and `highlight` is the tokenization of its fake worker. A per-file mock here
// would bleed across files (see markdown.test.tsx for the failure it caused).
// The `loadShiki` cases need their own registry, so they sit in
// boundary/code-block-load-shiki.test.ts, which runs on forks.

/**
 * Sets `navigator.clipboard` for the current case. `undefined` removes the
 * Clipboard API, as an insecure origin does.
 *
 * @remarks
 * `onTestFinished` restores the property, also after a case that times out.
 */
function stubClipboard(clipboard: { writeText: (value: string) => Promise<void> } | undefined) {
	const original = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard')

	Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: clipboard })

	onTestFinished(() => {
		if (original) Object.defineProperty(window.navigator, 'clipboard', original)
		else delete (window.navigator as { clipboard?: unknown }).clipboard
	})
}

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

	// TypeScript does not report an unknown `data-*` or `aria-*` attribute, so a
	// closed surface drops it with no error.
	it('passes the <div> attributes to its root', async () => {
		const { container } = renderUI(
			<CodeBlock
				code="const attrs = 1"
				id="attrs-block"
				data-testid="attrs-block"
				aria-describedby="attrs-note"
			/>,
		)

		const el = bySlot(container, 'code-block')

		expect(el).toHaveAttribute('id', 'attrs-block')

		expect(el).toHaveAttribute('data-testid', 'attrs-block')

		expect(el).toHaveAttribute('aria-describedby', 'attrs-note')

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('lets a wrapper re-anchor it with its own data-slot', async () => {
		const { container } = renderUI(<CodeBlock code="const anchor = 1" data-slot="snippet" />)

		expect(bySlot(container, 'snippet')?.tagName).toBe('DIV')

		expect(bySlot(container, 'code-block')).toBeNull()

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

	// A refused copy leaves the button at rest, which looks the same as no copy.
	// A frame with no clipboard-write permission refuses the write, and an
	// insecure origin has no Clipboard API.
	it.each([
		['refuses the write', { writeText: vi.fn().mockRejectedValue(new Error('denied')) }],
		['has no Clipboard API', undefined],
	])('announces a refused copy when the platform %s', async (_, clipboard) => {
		stubClipboard(clipboard)

		const { container } = renderUI(<CodeBlock code="refused-copy-token" />)

		fireEvent.click(present(bySlot(container, 'copy-button'), 'copy button'))

		await expectAnnouncement('Copy failed')

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('trims leading and trailing whitespace from the input code', async () => {
		const { container } = renderUI(<CodeBlock code="   padded   " copy={false} />)

		expect(screen.getByText('padded')).toBeInTheDocument()

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('finishes a load that outlives its block, and reports nothing', async () => {
		const reported = vi.spyOn(console, 'error').mockImplementation(() => {})

		const calls = highlight.mock.results.length

		const { unmount } = renderUI(<CodeBlock code="unique-unmount-token" />)

		// Tear the component down on the same tick, before the worker answers.
		unmount()

		// The whole chain runs after the unmount. One microtask ended the case
		// before any of it ran, so nothing the case read could change. The case
		// waits on the tokenization in the fake worker. The reply and the cache
		// write behind it are microtasks, so one tick then runs them.
		await highlight.mock.results[calls]?.value

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
		const calls = highlight.mock.calls.length

		const { container, rerender } = renderUI(<CodeBlock code="stream-a" copy={false} />)

		for (const chunk of ['stream-ab', 'stream-abc', 'stream-abcd']) {
			rerender(<CodeBlock code={chunk} copy={false} />)
		}

		await waitFor(() =>
			expect(container.querySelector('pre.shiki')?.textContent).toBe('stream-abcd'),
		)

		const tokenized = highlight.mock.calls.slice(calls).map(([code]) => code)

		expect(tokenized).toEqual(['stream-a', 'stream-abcd'])
	})

	it('paints markup that another block cached while its own pass ran', async () => {
		const settle: { first: () => void } = { first: () => {} }

		// Hold the first pass of block A, so that block B tokenizes the newest code
		// and fills the cache before that pass settles.
		highlight.mockImplementationOnce(
			(code: string) =>
				new Promise((resolve) => {
					settle.first = () => resolve(`<pre class="shiki"><code>${code}</code></pre>`)
				}),
		)

		const a = renderUI(<CodeBlock code="race-a" copy={false} />)

		await waitFor(() =>
			expect(highlight).toHaveBeenLastCalledWith('race-a', expect.anything(), expect.anything()),
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

	it('paints primed markup on its first render, and the worker does not run', () => {
		const calls = highlight.mock.calls.length

		// The defaults of the block and the trim of the code key the entry, as
		// they key a block.
		primeCodeBlock({
			code: '  primed-token  ',
			html: '<pre class="shiki" data-primed=""><code>primed-token</code></pre>',
		})

		const { container } = renderUI(<CodeBlock code="primed-token" copy={false} />)

		expect(container.querySelector('pre.shiki[data-primed]')).not.toBeNull()

		expect(highlight.mock.calls.length).toBe(calls)
	})

	it('commits a block that hits the cache once, with no second render', () => {
		primeCodeBlock({
			code: 'one-commit-token',
			html: '<pre class="shiki" data-primed=""><code>one-commit-token</code></pre>',
		})

		const onRender = vi.fn()

		const { container } = renderUI(
			<Profiler id="code-block" onRender={onRender}>
				<CodeBlock code="one-commit-token" copy={false} />
			</Profiler>,
		)

		expect(container.querySelector('pre.shiki[data-primed]')).not.toBeNull()

		// The effect finds the entry that the block holds, so it starts no render.
		expect(onRender.mock.calls.map(([, phase]) => phase)).toEqual(['mount'])
	})

	it('keeps the cached markup of a block after the cache evicts it', () => {
		const calls = highlight.mock.calls.length

		primeCodeBlock({
			code: 'evicted-token',
			html: '<pre class="shiki" data-primed=""><code>evicted-token</code></pre>',
		})

		const { container, rerender } = renderUI(<CodeBlock code="evicted-token" copy={false} />)

		expect(container.querySelector('pre.shiki[data-primed]')).not.toBeNull()

		// The cache holds 200 entries. That many new snippets evict each older entry.
		for (let i = 0; i < 200; i++) {
			primeCodeBlock({ code: `evict-filler-${i}`, html: '<pre></pre>' })
		}

		// The code does not change, so the effect of the block does not run again.
		rerender(<CodeBlock code="evicted-token" copy={false} className="again" />)

		expect(container.querySelector('pre.shiki[data-primed]')).not.toBeNull()

		expect(highlight.mock.calls.length).toBe(calls)
	})

	it('evicts no entry when a write replaces a cached snippet', () => {
		const calls = highlight.mock.calls.length

		// 200 new snippets fill the cache, and `rewrite-0` is its oldest entry.
		for (let i = 0; i < 200; i++) {
			primeCodeBlock({
				code: `rewrite-${i}`,
				html: `<pre class="shiki" data-primed=""><code>rewrite-${i}</code></pre>`,
			})
		}

		// The key is in the cache, so the write adds no entry.
		primeCodeBlock({ code: 'rewrite-199', html: '<pre></pre>' })

		const { container } = renderUI(<CodeBlock code="rewrite-0" copy={false} />)

		expect(container.querySelector('pre.shiki[data-primed]')).not.toBeNull()

		expect(highlight.mock.calls.length).toBe(calls)
	})

	it('keeps the place of a cached snippet that a write replaces', () => {
		const calls = highlight.mock.calls.length

		// 200 new snippets fill the cache, and `order-0` is its oldest entry.
		for (let i = 0; i < 200; i++) {
			primeCodeBlock({
				code: `order-${i}`,
				html: `<pre class="shiki" data-primed=""><code>order-${i}</code></pre>`,
			})
		}

		// `order-0` stays the oldest entry, so the next new snippet evicts it, and
		// `order-1` stays.
		primeCodeBlock({ code: 'order-0', html: '<pre></pre>' })

		primeCodeBlock({ code: 'order-new', html: '<pre></pre>' })

		const { container } = renderUI(<CodeBlock code="order-1" copy={false} />)

		expect(container.querySelector('pre.shiki[data-primed]')).not.toBeNull()

		expect(highlight.mock.calls.length).toBe(calls)
	})

	it('paints markup that the cache gets after the render and before the effect', () => {
		const calls = highlight.mock.calls.length

		// A layout effect runs in the commit, before each passive effect. The block
		// thus renders with no entry and finds the entry in its effect.
		function PrimeInCommit() {
			useLayoutEffect(() => {
				primeCodeBlock({
					code: 'late-token',
					html: '<pre class="shiki" data-primed=""><code>late-token</code></pre>',
				})
			}, [])

			return null
		}

		const { container } = renderUI(
			<>
				<CodeBlock code="late-token" copy={false} />
				<PrimeInCommit />
			</>,
		)

		expect(container.querySelector('pre.shiki[data-primed]')).not.toBeNull()

		expect(highlight.mock.calls.length).toBe(calls)
	})

	it('keeps primed markup to its own language and theme', async () => {
		primeCodeBlock({
			code: 'primed-lang-token',
			lang: 'ts',
			html: '<pre class="shiki" data-primed=""><code>primed-lang-token</code></pre>',
		})

		const { container } = renderUI(<CodeBlock code="primed-lang-token" copy={false} />)

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())

		expect(container.querySelector('pre.shiki')).toHaveAttribute('data-lang', 'tsx')

		expect(container.querySelector('[data-primed]')).toBeNull()
	})
})

// CodeBlockVariants gives the `size` axis of inline Code. A JSX spread gets no
// excess-property check, so a spread of the variants compiles on the block also
// when the block has no `size`. The step must then open a density scope.
describe('CodeBlock size', () => {
	it('opens a scope for the size of its variants', async () => {
		const variants: CodeBlockVariants = { size: 'lg' }

		const { container } = renderUI(<CodeBlock code="const step = 1" {...variants} />)

		const block = getSlot(container, 'code-block')

		expect(block).toHaveAttribute('data-density', 'lg')

		expect(block).not.toHaveAttribute('size')

		expect(densityStepOf(present(block.firstElementChild, 'scroll container'))).toBe('lg')

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('opens no scope with no size, so it takes the step of the nearest scope', async () => {
		const { container } = renderUI(<CodeBlock code="const scope = 1" />)

		expect(getSlot(container, 'code-block')).not.toHaveAttribute('data-density')

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})
})

describe('CodeBlock hydration', () => {
	/** Hydrates `markup` in a new container, and records each recoverable error. */
	function hydrate(markup: string, element: ReactElement) {
		const container = attach(document.createElement('div'))

		container.innerHTML = markup

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, element, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		return { container, onRecoverableError }
	}

	it('renders the plain block on the server, also for a snippet in the cache', () => {
		primeCodeBlock({
			code: 'server-token',
			html: '<pre class="shiki"><code>server-token</code></pre>',
		})

		const markup = renderToString(<CodeBlock code="server-token" copy={false} />)

		expect(markup).toContain('server-token')

		expect(markup).not.toContain('shiki')
	})

	it('hydrates the server output, and paints a primed snippet in the next render', () => {
		const element = <CodeBlock code="hydrate-token" copy={false} />

		// The server has an empty cache, and the client primes the snippet before
		// it hydrates.
		const markup = renderToString(element)

		primeCodeBlock({
			code: 'hydrate-token',
			html: '<pre class="shiki" data-primed=""><code>hydrate-token</code></pre>',
		})

		const { container, onRecoverableError } = hydrate(markup, element)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container.querySelector('pre.shiki[data-primed]')).not.toBeNull()
	})

	it('hydrates the server output, and highlights in the worker after it', async () => {
		const element = <CodeBlock code="hydrate-worker-token" copy={false} />

		const { container, onRecoverableError } = hydrate(renderToString(element), element)

		expect(onRecoverableError).not.toHaveBeenCalled()

		await waitFor(() =>
			expect(container.querySelector('pre.shiki')?.textContent).toBe('hydrate-worker-token'),
		)
	})
})
