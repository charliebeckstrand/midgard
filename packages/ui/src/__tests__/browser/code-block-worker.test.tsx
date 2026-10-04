import { describe, expect, it } from 'vitest'
import { CodeBlock } from '../../components/code'
import { renderUI, waitFor } from '../helpers'
import { budget } from './helpers/wall-clock'

/**
 * The real Shiki worker of {@link CodeBlock}. jsdom has no `Worker`, so the
 * jsdom suites run a fake worker. This case runs the module worker, the lazy
 * chunk of the grammar, and the lazy chunk of the theme.
 */
describe('CodeBlock in a module worker', () => {
	it('shows the plain block, and then the markup of the worker', async () => {
		const code = 'const answer: number = 42'

		const { container } = renderUI(<CodeBlock code={code} copy={false} />)

		expect(container.querySelector('pre.shiki')).toBeNull()

		expect(container.querySelector('pre')?.textContent).toBe(code)

		// The first request starts the worker. The worker then loads Shiki, the
		// grammar, and the theme, so the wait is longer than the default.
		const pre = await waitFor(
			() => {
				const found = container.querySelector('pre.shiki')

				expect(found).not.toBeNull()

				return found
			},
			{ timeout: budget(10_000) },
		)

		expect(pre).toHaveClass('github-dark-default')

		expect(pre).toHaveAttribute('tabindex', '-1')

		expect(pre?.textContent).toBe(code)

		// A grammar gives each token its own color.
		expect(pre?.querySelectorAll('span[style]').length).toBeGreaterThan(3)
	})
})
