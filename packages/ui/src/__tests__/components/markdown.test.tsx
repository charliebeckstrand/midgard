import { describe, expect, it } from 'vitest'
import { Markdown } from '../../components/markdown'
import { bySlot, renderUI, waitFor } from '../helpers'

// `shiki` is mocked globally in setup/module-mocks.ts (its markup carries
// `data-lang` from `options.lang`); a per-file mock here would bleed across the
// vmThreads worker under shuffle.

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

		expect((boxes?.[0] as HTMLInputElement | undefined)?.checked).toBe(true)

		expect((boxes?.[1] as HTMLInputElement | undefined)?.checked).toBe(false)

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

	it('strips dangerous URL schemes from links and images', () => {
		const { container } = renderUI(
			<Markdown>{'[click](javascript:alert(1)) and ![x](vbscript:msgbox)'}</Markdown>,
		)

		const el = bySlot(container, 'markdown')

		// A `javascript:` / `vbscript:` URL renders no href/src, so a click runs nothing.
		expect(el?.querySelector('a')).not.toHaveAttribute('href')

		expect(el?.querySelector('img')).not.toHaveAttribute('src')
	})

	it('keeps safe link URLs and data-URI images', () => {
		const { container } = renderUI(
			<Markdown>{'[ok](https://example.com) ![pic](data:image/png;base64,iVBORw0KGgo=)'}</Markdown>,
		)

		const el = bySlot(container, 'markdown')

		expect(el?.querySelector('a')).toHaveAttribute('href', 'https://example.com')

		expect(el?.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/png/)
	})

	it('strips a scheme hidden behind a leading control character', () => {
		// The URL parser trims leading C0 controls at click time, so
		// `javascript:` resolves to `javascript:` and runs. marked preserves
		// the byte in an angle-bracket destination; the scheme guard must drop the
		// whole C0 range, not just `\s`, or this slips through with a live href.
		const src = `[click](<${String.fromCharCode(1)}javascript:alert(1)>)`

		const { container } = renderUI(<Markdown>{src}</Markdown>)

		expect(bySlot(container, 'markdown')?.querySelector('a')).not.toHaveAttribute('href')
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
