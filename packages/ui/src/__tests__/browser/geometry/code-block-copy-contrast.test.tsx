import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { CodeBlock, primeCodeBlock } from '../../../components/code'
import { contrastRatio, WCAG_NON_TEXT } from '../../../utilities/contrast'
import { getSlot, present, renderUI, waitFor } from '../../helpers'

/**
 * The copy glyph of a code block in light mode, against the canvas of the block.
 *
 * The canvas is dark in the two modes, but the bare button takes its
 * light-mode colors in light mode: zinc-500 at rest and zinc-950 under the
 * pointer. The kata of the block must paint the dark-mode colors on the button
 * in light mode too. Its override read a state that CopyButton does not write,
 * so it did not paint. Under the pointer, the glyph then had a contrast of
 * about 1.05:1 against the canvas.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no
 * stylesheet, and `:hover` is not a state that it can enter.
 */
describe('the copy glyph of a code block, in light mode (real browser)', () => {
	function render() {
		const { container } = renderUI(<CodeBlock code="const answer = 42" />)

		const canvas = getComputedStyle(getSlot(container, 'code-block')).backgroundColor

		const button = getSlot<HTMLButtonElement>(container, 'copy-button')

		return { button, contrast: () => contrastRatio(getComputedStyle(button).color, canvas) }
	}

	it('keeps 3:1 against the canvas at rest and under the pointer (WCAG 1.4.11)', async () => {
		const { button, contrast } = render()

		expect(contrast()).toBeGreaterThanOrEqual(WCAG_NON_TEXT)

		await userEvent.hover(button)

		expect(contrast()).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})

	/**
	 * The override paints only at rest. An override with no gate also passes the
	 * case above, but it hides the green palette of the copied state.
	 */
	it('lets the copied state take its own color under the pointer', async () => {
		vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

		const { button } = render()

		await userEvent.hover(button)

		const rest = getComputedStyle(button).color

		await userEvent.click(button)

		await waitFor(() => expect(button).toHaveAttribute('aria-label', 'Copied'))

		expect(getComputedStyle(button).color).not.toBe(rest)
	})
})

/**
 * A code block with a light theme, in each color mode.
 *
 * Shiki writes the background of the theme on the `<pre>`. The frame of the
 * block must paint the same background, so that the block has one tone. The
 * glyph of the copy button sits on the frame, so it must read on a light
 * background: the colors of the dark canvas do not read there.
 *
 * The primed markup has the shape of the Shiki output for
 * `github-light-default`, so no worker runs.
 */
describe('the copy glyph of a code block with a light theme (real browser)', () => {
	afterEach(() => {
		document.documentElement.classList.remove('dark')
	})

	it.each([false, true])(
		'paints the theme background on the frame, and keeps 3:1 in each state (dark: %s)',
		async (dark) => {
			if (dark) document.documentElement.classList.add('dark')

			vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

			const code = `const light = ${dark}`

			primeCodeBlock({
				code,
				theme: 'github-light-default',
				html: `<pre class="shiki github-light-default" style="background-color:#ffffff;color:#1f2328" tabindex="-1"><code><span class="line"><span>${code}</span></span></code></pre>`,
			})

			const { container } = renderUI(<CodeBlock code={code} theme="github-light-default" />)

			const pre = present(container.querySelector('pre.shiki'), 'the primed markup')

			const canvas = getComputedStyle(getSlot(container, 'code-block')).backgroundColor

			expect(canvas).toBe(getComputedStyle(pre).backgroundColor)

			const button = getSlot<HTMLButtonElement>(container, 'copy-button')

			const contrast = () => contrastRatio(getComputedStyle(button).color, canvas)

			expect(contrast(), 'at rest').toBeGreaterThanOrEqual(WCAG_NON_TEXT)

			await userEvent.hover(button)

			expect(contrast(), 'under the pointer').toBeGreaterThanOrEqual(WCAG_NON_TEXT)

			await userEvent.click(button)

			await waitFor(() => expect(button).toHaveAttribute('aria-label', 'Copied'))

			expect(contrast(), 'copied, under the pointer').toBeGreaterThanOrEqual(WCAG_NON_TEXT)

			await userEvent.unhover(button)

			expect(contrast(), 'copied, at rest').toBeGreaterThanOrEqual(WCAG_NON_TEXT)
		},
	)
})
