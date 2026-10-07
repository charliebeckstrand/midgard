import { Lexer } from 'marked'
import { describe, expect, it, vi } from 'vitest'
import { Markdown, MarkdownInline, primeMarkdown } from '../../components/markdown'
import { bySlot, renderUI, screen, waitFor } from '../helpers'

// `shiki` is mocked globally in setup/module-mocks.ts (its markup carries
// `data-lang` from `options.lang`); a per-file mock here would bleed across
// files (see setup/module-mocks.ts).

describe('Markdown', () => {
	it('renders parsed Markdown into a data-slot="markdown" div', () => {
		const { container } = renderUI(<Markdown>{'# Title'}</Markdown>)

		const el = bySlot(container, 'markdown')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')

		expect(el?.querySelector('h1')?.textContent).toBe('Title')
	})

	it('moves each heading down by headingOffset, to h6 at most, and keeps the look of its depth', () => {
		const md = '# Title\n\n> ## Quoted\n\n- ### Listed\n\n##### Deep'

		const { container: plain } = renderUI(<Markdown>{md}</Markdown>)

		const { container } = renderUI(<Markdown headingOffset={2}>{md}</Markdown>)

		const tags = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => [
			h.tagName,
			h.textContent,
		])

		expect(tags).toEqual([
			['H3', 'Title'],
			['H4', 'Quoted'],
			['H5', 'Listed'],
			['H6', 'Deep'],
		])

		// The look stays that of the source depth: the `#` heading keeps the classes
		// of the `<h1>` of the plain render.
		expect(container.querySelector('h3')?.className).toBe(plain.querySelector('h1')?.className)
	})

	it('renders inline emphasis, code, and links', () => {
		const md = 'Some **bold**, `code`, and a [link](https://example.com).'

		const { container } = renderUI(<Markdown>{md}</Markdown>)

		const el = bySlot(container, 'markdown')

		expect(el?.querySelector('strong')?.textContent).toBe('bold')

		expect(el?.querySelector('code')?.textContent).toBe('code')

		expect(el?.querySelector('a')).toHaveAttribute('href', 'https://example.com')
	})

	it('joins the lines of a paragraph, and renders each line break as a <br> with breaks', () => {
		const md = 'First line\nSecond line'

		const { container: plain } = renderUI(<Markdown>{md}</Markdown>)

		expect(plain.querySelector('br')).toBeNull()

		const { container } = renderUI(<Markdown breaks>{md}</Markdown>)

		const paragraphs = container.querySelectorAll('p')

		expect(paragraphs).toHaveLength(1)

		expect(paragraphs[0]?.querySelectorAll('br')).toHaveLength(1)
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
		const { container } = renderUI(<MarkdownInline>{'Some **bold** text'}</MarkdownInline>)

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

	it.each([
		['a tight item', '- [x] Ship **the** `fix` &amp; [docs](https://example.com)'],
		[
			'a loose item',
			'- [x] Ship **the** `fix` &amp; [docs](https://example.com)\n\n  More text\n\n- [ ] b',
		],
	])('names the checkbox of %s from the plain text of the item', (_name, md) => {
		renderUI(<Markdown>{md}</Markdown>)

		expect(screen.getByRole('checkbox', { name: 'Ship the fix & docs' })).toBeChecked()
	})

	it('names the checkbox of a task item without its nested list', () => {
		renderUI(<Markdown>{'- [ ] Parent\n  - [x] Child'}</Markdown>)

		expect(screen.getByRole('checkbox', { name: 'Parent' })).not.toBeChecked()

		expect(screen.getByRole('checkbox', { name: 'Child' })).toBeChecked()
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

	it('decodes entity references in text, image alt, and titles', () => {
		const md =
			'AT&amp;T &copy; &#8212; &#x41; &unknown; [l](/a "x &amp; y") ![a &lt; b](/i.png "&quot;t&quot;")'

		const { container } = renderUI(<Markdown>{md}</Markdown>)

		const el = bySlot(container, 'markdown')

		expect(el?.querySelector('p')?.textContent).toContain('AT&T © — A &unknown;')

		expect(el?.querySelector('a')).toHaveAttribute('title', 'x & y')

		expect(el?.querySelector('img')).toHaveAttribute('alt', 'a < b')

		expect(el?.querySelector('img')).toHaveAttribute('title', '"t"')
	})

	it('decodes a reference to code point zero to U+FFFD, and keeps a name outside the known set', () => {
		const { container } = renderUI(<Markdown>{'a&#0;b &Aacute; &amp'}</Markdown>)

		expect(bySlot(container, 'markdown')?.textContent).toBe('a\uFFFDb &Aacute; &amp')
	})

	it('decodes each entity reference once', () => {
		const { container } = renderUI(<Markdown>{'- [x] &#38;amp; &#38;#169;'}</Markdown>)

		expect(bySlot(container, 'markdown')?.textContent).toBe('&amp; &#169;')

		expect(screen.getByRole('checkbox', { name: '&amp; &#169;' })).toBeChecked()
	})

	it('renders a decoded tag as text, never as markup', () => {
		const { container } = renderUI(<Markdown>{'&lt;script&gt;alert(1)&lt;/script&gt;'}</Markdown>)

		const el = bySlot(container, 'markdown')

		expect(el?.querySelector('script')).toBeNull()

		expect(el?.textContent).toBe('<script>alert(1)</script>')
	})

	it('keeps entity references literal in code', () => {
		const { container } = renderUI(<Markdown>{'`&amp;`'}</Markdown>)

		expect(bySlot(container, 'code')).toHaveTextContent('&amp;')
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

describe('primeMarkdown', () => {
	it('lexes a source once, and a block with that source renders with no lex', () => {
		const lex = vi.spyOn(Lexer.prototype, 'lex')

		primeMarkdown('A *primed* source.')

		expect(lex).toHaveBeenCalledTimes(1)

		const { container } = renderUI(<Markdown>{'A *primed* source.'}</Markdown>)

		expect(container.querySelector('em')?.textContent).toBe('primed')

		expect(lex).toHaveBeenCalledTimes(1)

		lex.mockRestore()
	})

	it('primes the breaks form apart from the plain form', () => {
		const lex = vi.spyOn(Lexer.prototype, 'lex')

		primeMarkdown('A primed\nsource.', { breaks: true })

		expect(lex).toHaveBeenCalledTimes(1)

		const { container } = renderUI(<Markdown breaks>{'A primed\nsource.'}</Markdown>)

		expect(container.querySelector('br')).toBeInTheDocument()

		expect(lex).toHaveBeenCalledTimes(1)

		renderUI(<Markdown>{'A primed\nsource.'}</Markdown>)

		expect(lex).toHaveBeenCalledTimes(2)

		lex.mockRestore()
	})
})

describe('Markdown code fence', () => {
	it('keeps the indentation of the first line of a fenced block', async () => {
		const md = ['```yaml', '  name: midgard', '  private: true', '```'].join('\n')

		const { container } = renderUI(<Markdown>{md}</Markdown>)

		const text = () => container.querySelector('pre')?.textContent ?? ''

		// The first line keeps its two spaces, as the second line does.
		expect(text()).toMatch(/^ {2}name: midgard\n {2}private: true/)

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())

		expect(text()).toMatch(/^ {2}name: midgard\n {2}private: true/)
	})
})
