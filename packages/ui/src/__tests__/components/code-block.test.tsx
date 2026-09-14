import { afterEach, describe, expect, it } from 'vitest'
import { CodeBlock, loadShiki } from '../../components/code/code-block'
import { bySlot, renderUI, screen, waitFor } from '../helpers'
import { failShikiImport } from '../mocks/shiki'

// `shiki` is mocked globally in setup/module-mocks.ts; a per-file mock here
// would bleed across files (see markdown.test.tsx for the failure it caused).

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

	it('renders a plain-text fallback before shiki has tokenised', async () => {
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

	it('renders the highlighted html once shiki resolves', async () => {
		const { container } = renderUI(<CodeBlock code="const x = 1" />)

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('trims leading and trailing whitespace from the input code', async () => {
		const { container } = renderUI(<CodeBlock code="   padded   " copy={false} />)

		expect(screen.getByText('padded')).toBeInTheDocument()

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('does not throw when unmounted before shiki resolves', async () => {
		const { unmount } = renderUI(<CodeBlock code="unique-unmount-token" />)

		// Tear the component down on the same tick; the cancelled flag inside the effect
		// suppresses the trailing setHtml call.
		unmount()

		// Let pending microtasks settle so the effect cleanup runs.
		await Promise.resolve()
	})
})

describe('loadShiki', () => {
	afterEach(() => failShikiImport(null))

	it('memoises a resolved import so the heavy module is fetched once', async () => {
		const first = loadShiki()

		await expect(first).resolves.toBeDefined()

		expect(loadShiki()).toBe(first)
	})

	it('drops a rejected import from the memo so a later call retries', async () => {
		// A second instance of the module, so its `shikiPromise` cell starts empty.
		// One registry serves every file a worker runs, so a sibling render has
		// already memoised a resolved import, and `vi.resetModules()` is barred
		// (see test-isolation-boundary.test.ts). The query suffix gives this case
		// its own instance; the shared one stays untouched. Keep the specifier in
		// a variable: TypeScript resolves a literal `import()` argument, and the
		// suffixed path has no declaration.
		const coldSpecifier = '../../components/code/code-block?cold'

		const { loadShiki: loadShikiCold } = (await import(
			/* @vite-ignore */ coldSpecifier
		)) as typeof import('../../components/code/code-block')

		failShikiImport(new Error('chunk fetch failed'))

		const rejected = loadShikiCold()

		await expect(rejected).rejects.toThrow()

		failShikiImport(null)

		const retry = loadShikiCold()

		expect(retry).not.toBe(rejected)

		await expect(retry).resolves.toBeDefined()
	})
})
