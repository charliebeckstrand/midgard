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
 * An anchor on a range that crosses bold. The range draws as four pieces, and
 * only the first is a control, so the range is one tab stop. The bold stays the
 * element that holds its text.
 */
describe('Markdown: an anchor on a range', () => {
	it('gives the range one tab stop, before the link of the next paragraph', async () => {
		const { container } = renderUI(
			<Markdown ranges={[RANGE]} renderRange={anchor}>
				{SOURCE}
			</Markdown>,
		)

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement?.getAttribute('data-testid')).toBe('anchor')

		expect(document.activeElement?.textContent).toBe('from ')

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement?.tagName).toBe('A')

		expect(container.querySelectorAll('strong > [data-testid="piece"]')).toHaveLength(2)

		expect(container.querySelector('p')?.textContent).toBe(
			'Late stops rose from 4 to 14 this week.',
		)
	})
})
