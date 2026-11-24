import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Markdown, type MarkdownRangePiece } from '../../components/markdown'
import { renderUI } from '../helpers'

const SOURCE =
	'Late stops rose from **4** to **14** this week.\n\nSee [the map](https://example.com).'

const QUOTE = 'from **4** to **14**'

const RANGE = {
	id: 'late',
	start: SOURCE.indexOf(QUOTE),
	end: SOURCE.indexOf(QUOTE) + QUOTE.length,
	quote: QUOTE,
}

/** A control on piece 0, and plain pieces after it, as a citation draws them. */
function anchor({ index }: MarkdownRangePiece, children: ReactNode): ReactNode {
	return index === 0 ? (
		<button type="button" data-testid="anchor">
			{children}
		</button>
	) : (
		<span data-testid="piece">{children}</span>
	)
}

/**
 * An anchor on a range that holds each bold that it touches whole. The range
 * draws as one piece around the bold, so the control holds the whole phrase,
 * and its focus ring goes around all of it.
 */
describe('Markdown: an anchor on a range', () => {
	it('gives the range one tab stop around the whole phrase, before the link of the next paragraph', async () => {
		const { container } = renderUI(
			<Markdown ranges={[RANGE]} renderRange={anchor}>
				{SOURCE}
			</Markdown>,
		)

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement?.getAttribute('data-testid')).toBe('anchor')

		expect(document.activeElement?.textContent).toBe('from 4 to 14')

		expect(document.activeElement?.querySelectorAll('strong')).toHaveLength(2)

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement?.tagName).toBe('A')

		expect(container.querySelectorAll('[data-testid="piece"]')).toHaveLength(0)

		expect(container.querySelector('p')?.textContent).toBe(
			'Late stops rose from 4 to 14 this week.',
		)
	})
})
