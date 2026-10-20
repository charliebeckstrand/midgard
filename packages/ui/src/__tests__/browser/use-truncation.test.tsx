import { type CSSProperties, useEffect, useRef } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { useTruncation } from '../../hooks/use-truncation'
import { renderUI, screen, waitFor } from '../helpers'
import { frames } from '../helpers/frames'

/**
 * {@link useTruncation} reads a sub-pixel clip from a `Range` over the laid-out
 * contents. jsdom implements no `Range` geometry, so its unit suite can only
 * exercise the comparison against a stub. The claims that matter are layout
 * claims, so they ride the real browser: a clipped overflow still measures its
 * full text width, a fitting string does not, padding comes out of the content
 * box, and nothing is injected into the measured element.
 *
 * The hook measures after the first hover or focus, so each case hovers the
 * label before it reads the verdict.
 */
describe('useTruncation (real browser)', () => {
	beforeAll(() => page.viewport(800, 600))

	const single: CSSProperties = {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		font: '16px sans-serif',
	}

	function Probe({ text, style }: { text: string; style: CSSProperties }) {
		const [ref, truncated] = useTruncation<HTMLDivElement>()

		return (
			<div>
				<div ref={ref} data-testid="label" style={{ ...single, ...style }}>
					{text}
				</div>
				<span data-testid="result">{truncated ? 'truncated' : 'fits'}</span>
			</div>
		)
	}

	/** Renders the probe and hovers its label, which arms the measure. */
	async function renderArmed(text: string, style: CSSProperties) {
		renderUI(<Probe text={text} style={style} />)

		await userEvent.hover(screen.getByTestId('label'))
	}

	const verdict = () => screen.getByTestId('result').textContent

	it('measures nothing before the first contact', async () => {
		renderUI(
			<Probe text="a considerably longer label than the box can hold" style={{ width: 80 }} />,
		)

		// The clip is in layout by now. An eager measure would have read it.
		await frames()

		expect(verdict()).toBe('fits')
	})

	it('reads a fitting string as not truncated', async () => {
		await renderArmed('ok', { width: 400 })

		await expect.poll(verdict).toBe('fits')
	})

	it('reads a clipped string as truncated, and leaves the measured element as it was', async () => {
		await renderArmed('a considerably longer label than the box can hold', { width: 80 })

		await waitFor(() => expect(verdict()).toBe('truncated'))

		const label = screen.getByTestId('label')

		// A mirror span would sit here as a child of a React-owned element, with a
		// second copy of the text behind it.
		expect(label.children).toHaveLength(0)

		expect(label.textContent).toBe('a considerably longer label than the box can hold')
	})

	it('re-measures when the box resizes, with no re-render to prompt it', async () => {
		await renderArmed('a label with several words', { width: 700 })

		await expect.poll(verdict).toBe('fits')

		// A real resize, not a prop change: nothing re-renders the probe, so the
		// verdict can only move if the hook's own observer re-measured.
		screen.getByTestId('label').style.width = '60px'

		await waitFor(() => expect(verdict()).toBe('truncated'))
	})

	it('arms on a focus that an effect moves, and measures after the commit', async () => {
		// A focus from an effect lands inside a React commit, where `flushSync`
		// cannot flush. The console guard fails the case on the warning that a
		// flushing arm logs there.
		function Focused() {
			const button = useRef<HTMLButtonElement>(null)

			const [ref, truncated] = useTruncation<HTMLSpanElement>({ armRef: button })

			useEffect(() => {
				button.current?.focus()
			}, [])

			return (
				<div>
					<button ref={button} type="button" style={{ width: 80, padding: 0, border: 0 }}>
						<span ref={ref} style={{ ...single, display: 'block' }}>
							a considerably longer label than the box can hold
						</span>
					</button>
					<span data-testid="result">{truncated ? 'truncated' : 'fits'}</span>
				</div>
			)
		}

		renderUI(<Focused />)

		await waitFor(() => expect(verdict()).toBe('truncated'))
	})

	it('accounts for horizontal padding in the content box', async () => {
		// 140px box less 90px of padding leaves a 50px content box. The string is
		// wider than that, so the padding is what decides the answer.
		await renderArmed('medium length', { width: 140, padding: '0 45px', boxSizing: 'border-box' })

		await waitFor(() => expect(verdict()).toBe('truncated'))
	})
})
