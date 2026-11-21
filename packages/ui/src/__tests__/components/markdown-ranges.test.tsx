import { fc, test } from '@fast-check/vitest'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
	Markdown,
	type MarkdownRange,
	type MarkdownRangePiece,
	useMarkdownRangeText,
} from '../../components/markdown'
import { renderUI, waitFor } from '../helpers'

/** A range over the first occurrence of `quote` in `source`. */
function findRange(source: string, quote: string, id = quote): MarkdownRange {
	const start = source.indexOf(quote)

	return { id, start, end: start + quote.length, quote }
}

/** The pieces that the default renderer drew. */
function pieces(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>('[data-slot="markdown-range"]')]
}

const text = (container: HTMLElement) => pieces(container).map((piece) => piece.textContent)

describe('Markdown ranges', () => {
	it('draws a range in plain text as one piece', () => {
		const md = 'Twelve stops are late today.'

		const { container } = renderUI(
			<Markdown ranges={[findRange(md, 'stops are late', 'late')]}>{md}</Markdown>,
		)

		expect(text(container)).toEqual(['stops are late'])

		expect(pieces(container)[0]).toHaveAttribute('data-range', 'late')

		expect(container.textContent).toBe(md)
	})

	it('splits a range that crosses bold into one piece for each text, in the element that holds it', () => {
		const md = 'Late stops rose from **4** to **14** this week.'

		const { container } = renderUI(
			<Markdown ranges={[findRange(md, 'from **4** to **14**')]}>{md}</Markdown>,
		)

		expect(text(container)).toEqual(['from ', '4', ' to ', '14'])

		expect(pieces(container)[1]?.parentElement?.tagName).toBe('STRONG')
	})

	it('gives each piece its index in the range', () => {
		const md = 'A **b** c.'

		const seen: number[] = []

		const render = ({ index }: MarkdownRangePiece, children: ReactNode) => {
			seen.push(index)

			return index === 0 ? <button type="button">{children}</button> : children
		}

		const { container } = renderUI(
			<Markdown ranges={[findRange(md, 'A **b** c')]} renderRange={render}>
				{md}
			</Markdown>,
		)

		expect(seen).toEqual([0, 1, 2])

		expect(container.querySelectorAll('button')).toHaveLength(1)

		expect(container.querySelector('button')?.textContent).toBe('A ')
	})

	it('splits a range at a paragraph break and across list items and a blockquote', () => {
		const md = 'one two\n\n- three\n  four\n- five\n\n> six\n> seven'

		const { container } = renderUI(<Markdown ranges={[findRange(md, md)]}>{md}</Markdown>)

		expect(text(container).join('|')).toBe('one two|three|four|five|six|seven')
	})

	it('draws a range in a heading and in a table cell', () => {
		const md = '## Late stops\n\n| Stop | State |\n| --- | --- |\n| Depot | late |'

		const { container } = renderUI(
			<Markdown ranges={[findRange(md, 'Late'), findRange(md, 'late |')]}>{md}</Markdown>,
		)

		expect(text(container)).toEqual(['Late', 'late'])

		expect(pieces(container)[1]?.closest('td')).not.toBeNull()
	})

	it('does not find the text of a table cell past the end of the table', () => {
		// marked gives the cell the text `a | b`, which its source does not hold.
		const md = '| a \\| b | x |\n|---|---|\n| c | d |\n\nSee a | b here.'

		const start = md.lastIndexOf('a | b')

		const { container } = renderUI(
			<Markdown
				ranges={[{ id: 'p', start, end: start + 5, quote: 'a | b' }, findRange(md, 'd', 'd')]}
			>
				{md}
			</Markdown>,
		)

		expect(
			pieces(container).map((piece) => [piece.dataset.range, piece.closest('td, p')?.tagName]),
		).toEqual([
			['d', 'TD'],
			['p', 'P'],
		])

		expect(container.querySelector('th [data-slot="markdown-range"]')).toBeNull()
	})

	it('puts no piece in a link, and draws the rest of the range', () => {
		const md = 'See [the late stops](https://example.com/late) on the map.'

		const { container } = renderUI(
			<Markdown ranges={[findRange(md, 'See [the late stops](https://example.com/late) on')]}>
				{md}
			</Markdown>,
		)

		expect(text(container)).toEqual(['See ', ' on'])

		expect(container.querySelector('a [data-slot="markdown-range"]')).toBeNull()
	})

	it('does not find text in a link destination', () => {
		const md = '[x](https://example.com/late) late'

		const { container } = renderUI(
			<Markdown ranges={[{ id: 'r', start: md.length - 4, end: md.length, quote: 'late' }]}>
				{md}
			</Markdown>,
		)

		expect(text(container)).toEqual(['late'])

		expect(container.querySelector('a')?.textContent).toBe('x')
	})

	it('puts no piece in a fenced code block, and finds text after it', async () => {
		const md = '```\nlate\n```\n\nlate'

		const { container } = renderUI(
			<Markdown ranges={[{ id: 'r', start: md.length - 4, end: md.length, quote: 'late' }]}>
				{md}
			</Markdown>,
		)

		expect(text(container)).toEqual(['late'])

		expect(container.querySelector('pre [data-slot="markdown-range"]')).toBeNull()

		await waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument())
	})

	it('draws a code span or an escape whole when a range covers part of it', () => {
		const md = 'Run `route --late` now \\* twice.'

		const { container } = renderUI(
			<Markdown ranges={[findRange(md, '--late'), findRange(md, '*')]}>{md}</Markdown>,
		)

		expect(text(container)).toEqual(['route --late', '*'])

		expect(pieces(container)[0]?.parentElement?.tagName).toBe('CODE')
	})

	it('moves a cut out of an entity reference, so that the reference decodes whole', () => {
		const md = 'Fish &amp; chips'

		const { container } = renderUI(
			<Markdown ranges={[{ id: 'r', start: 6, end: 15, quote: 'amp; chip' }]}>{md}</Markdown>,
		)

		expect(text(container)).toEqual(['& chip'])
	})

	it('drops a range whose quote does not match, which is out of bounds, or which is empty', () => {
		const md = 'Twelve stops are late.'

		const { container } = renderUI(
			<Markdown
				ranges={[
					{ id: 'stale', start: 0, end: 6, quote: 'Eleven' },
					{ id: 'ahead', start: 20, end: 40, quote: 'not yet streamed in' },
					{ id: 'empty', start: 3, end: 3, quote: '' },
				]}
			>
				{md}
			</Markdown>,
		)

		expect(pieces(container)).toHaveLength(0)

		expect(container.textContent).toBe(md)
	})

	it('draws a range when the streamed text reaches its quote', () => {
		const range: MarkdownRange = { id: 'r', start: 13, end: 22, quote: 'are late.' }

		const ranges = [range]

		const { container, rerender } = renderUI(<Markdown ranges={ranges}>{'Twelve stops'}</Markdown>)

		expect(pieces(container)).toHaveLength(0)

		rerender(<Markdown ranges={ranges}>{'Twelve stops are late.'}</Markdown>)

		expect(text(container)).toEqual(['are late.'])
	})

	it('keeps the first of two ranges that overlap', () => {
		const md = 'one two three four'

		const { container } = renderUI(
			<Markdown
				ranges={[
					findRange(md, 'two three', 'b'),
					findRange(md, 'one two', 'a'),
					findRange(md, 'three four', 'c'),
					findRange(md, 'four', 'd'),
				]}
			>
				{md}
			</Markdown>,
		)

		expect(pieces(container).map((piece) => piece.dataset.range)).toEqual(['a', 'c'])
	})

	it('keeps the outer of two ranges that nest, whichever comes first', () => {
		const md = 'one two three'

		const { container } = renderUI(
			<Markdown ranges={[findRange(md, 'two', 'inner'), findRange(md, md, 'outer')]}>
				{md}
			</Markdown>,
		)

		expect(pieces(container).map((piece) => piece.dataset.range)).toEqual(['outer'])
	})

	it('renders the same markup as before with no ranges', () => {
		const md = 'A **b** [c](https://example.com) `d` \\* &amp;\n\n- e\n  f'

		const { container: plain } = renderUI(<Markdown>{md}</Markdown>)

		const { container: empty } = renderUI(<Markdown ranges={[]}>{md}</Markdown>)

		const { container: missed } = renderUI(
			<Markdown ranges={[{ id: 'r', start: 0, end: 1, quote: 'Z' }]}>{md}</Markdown>,
		)

		expect(empty.innerHTML).toBe(plain.innerHTML)

		expect(missed.innerHTML).toBe(plain.innerHTML)
	})
})

/**
 * A document built from words in known places, so that the source offset of
 * each word is known without a parser. Each word is unique, and no word is a
 * prefix of another.
 */
type Word = { text: string; start: number; link: boolean }

const wrap = fc.constantFrom('plain', 'strong', 'em', 'code', 'link')

const line = fc.array(wrap, { minLength: 1, maxLength: 4 })

const block = fc.record({
	kind: fc.constantFrom('paragraph', 'item', 'quote', 'heading'),
	lines: fc.array(line, { minLength: 1, maxLength: 3 }),
})

function build(blocks: { kind: string; lines: string[][] }[]): { source: string; words: Word[] } {
	let source = ''

	const words: Word[] = []

	blocks.forEach(({ kind, lines }, at) => {
		if (at > 0) source += '\n\n'

		const used = kind === 'heading' ? lines.slice(0, 1) : lines

		used.forEach((wraps, row) => {
			if (row > 0) source += '\n'

			source += { paragraph: '', item: row === 0 ? '- ' : '  ', quote: '> ', heading: '## ' }[
				kind
			] as string

			wraps.forEach((form, column) => {
				if (column > 0) source += ' '

				const text = `a${words.length}z`

				const [open, close] = {
					plain: ['', ''],
					strong: ['**', '**'],
					em: ['*', '*'],
					code: ['`', '`'],
					link: ['[', `](https://example.com/${text})`],
				}[form] as [string, string]

				source += open

				words.push({ text, start: source.length, link: form === 'link' })

				source += text + close
			})
		})
	})

	return { source, words }
}

describe('Markdown ranges, over built documents', () => {
	test.prop([fc.array(block, { minLength: 1, maxLength: 5 }), fc.nat(), fc.nat()])(
		'a range from one word to another draws the text of each word between them outside a link',
		(blocks, a, b) => {
			const { source, words } = build(blocks)

			const first = words[a % words.length] as Word

			const last = words[b % words.length] as Word

			const [from, to] = first.start <= last.start ? [first, last] : [last, first]

			const end = to.start + to.text.length

			const range = { id: 'r', start: from.start, end, quote: source.slice(from.start, end) }

			const { container, unmount } = renderUI(<Markdown ranges={[range]}>{source}</Markdown>)

			const expected = words
				.filter((word) => word.start >= from.start && word.start < end && !word.link)
				.map((word) => word.text)
				.join('')

			const drawn = text(container).join('').replace(/\s/g, '')

			unmount()

			expect(drawn).toBe(expected)
		},
	)
})

/** Piece 0 of a range, with the text of the whole range as a data attribute. */
function NamedPiece({ piece, children }: { piece: MarkdownRangePiece; children: ReactNode }) {
	const name = useMarkdownRangeText(piece.range)

	return piece.index === 0 ? (
		<span data-slot="named" data-name={name}>
			{children}
		</span>
	) : (
		children
	)
}

const renderNamed = (piece: MarkdownRangePiece, children: ReactNode) => (
	<NamedPiece piece={piece}>{children}</NamedPiece>
)

/** The text that piece 0 of the one range in `source` reads. */
function readName(source: string, quote: string): string | null | undefined {
	const { container } = renderUI(
		<Markdown ranges={[findRange(source, quote)]} renderRange={renderNamed}>
			{source}
		</Markdown>,
	)

	return container.querySelector('[data-slot="named"]')?.getAttribute('data-name')
}

describe('useMarkdownRangeText', () => {
	it.each([
		['one piece', 'Twelve stops are late today.', 'stops are late', 'stops are late'],
		[
			'bold between words',
			'Late stops rose from **4** to **14** this week.',
			'from **4** to **14**',
			'from 4 to 14',
		],
		['bold in a word', 'It is **Tue**sday now.', '**Tue**sday', 'Tuesday'],
		['a soft line break', 'The stops are\nlate today.', 'are\nlate', 'are late'],
		['a block boundary', 'Twelve stops.\n\nMost on Tuesday.', 'stops.\n\nMost', 'stops. Most'],
		['an entity', 'Fish &amp; chips here.', 'Fish &amp; chips', 'Fish & chips'],
		['a code span', 'Run `npm i` now.', '`npm i` now', 'npm i now'],
	])('gives the whole text of a range across %s', (_, source, quote, name) => {
		expect(readName(source, quote)).toBe(name)
	})

	it('gives each range its own text when two ranges share an id', () => {
		const md = 'Twelve stops are late, most of them on **Tuesday**.'

		const { container } = renderUI(
			<Markdown
				ranges={[findRange(md, 'stops', 'hit'), findRange(md, 'on **Tuesday**', 'hit')]}
				renderRange={renderNamed}
			>
				{md}
			</Markdown>,
		)

		const names = [...container.querySelectorAll('[data-slot="named"]')].map((piece) =>
			piece.getAttribute('data-name'),
		)

		expect(names).toEqual(['stops', 'on Tuesday'])
	})

	it('gives undefined outside a render that drew the range', () => {
		function Outside() {
			return (
				<span data-slot="outside">{useMarkdownRangeText(findRange('a b', 'a')) ?? 'none'}</span>
			)
		}

		const { container } = renderUI(<Outside />)

		expect(container.textContent).toBe('none')
	})
})
