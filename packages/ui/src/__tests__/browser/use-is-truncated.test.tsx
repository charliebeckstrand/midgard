import { type RefObject, useRef } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { useIsTruncated } from '../../hooks/use-is-truncated'
import { renderUI, waitFor } from '../helpers'

/**
 * {@link useIsTruncated} measures the laid-out contents with a `Range`. jsdom
 * implements no `Range` geometry, so its unit suite can only exercise the hook
 * against a stub; the claims that matter — that a clipped overflow still
 * measures its full text width, that a fitting string does not, and that
 * nothing is injected into the measured element — are layout claims and ride the
 * real browser.
 */
describe('useIsTruncated (real browser)', () => {
	beforeAll(() => page.viewport(800, 600))

	function Probe({ text, width }: { text: string; width: number }) {
		const ref = useRef<HTMLDivElement>(null)

		const truncated = useIsTruncated(ref as RefObject<HTMLElement | null>, text)

		return (
			<div>
				<div
					ref={ref}
					data-testid="label"
					style={{
						width: `${width}px`,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						font: '16px sans-serif',
					}}
				>
					{text}
				</div>
				<span data-testid="result">{truncated ? 'truncated' : 'fits'}</span>
			</div>
		)
	}

	it('reads a clipped string as truncated', async () => {
		const { container } = renderUI(
			<Probe text="a considerably longer label than the box can hold" width={80} />,
		)

		await waitFor(() =>
			expect(container.querySelector('[data-testid="result"]')?.textContent).toBe('truncated'),
		)
	})

	it('reads a fitting string as not truncated', async () => {
		const { container } = renderUI(<Probe text="ok" width={400} />)

		await waitFor(() =>
			expect(container.querySelector('[data-testid="result"]')?.textContent).toBe('fits'),
		)
	})

	it('leaves the measured element with its own text and no injected node', async () => {
		const { container } = renderUI(
			<Probe text="a considerably longer label than the box can hold" width={80} />,
		)

		await waitFor(() =>
			expect(container.querySelector('[data-testid="result"]')?.textContent).toBe('truncated'),
		)

		const label = container.querySelector('[data-testid="label"]')

		// A mirror span would sit here as a child of a React-owned element, with a
		// second copy of the text behind it.
		expect(label?.children).toHaveLength(0)

		expect(label?.textContent).toBe('a considerably longer label than the box can hold')
	})

	it('accounts for horizontal padding in the content box', async () => {
		function Padded() {
			const ref = useRef<HTMLDivElement>(null)

			const truncated = useIsTruncated(ref as RefObject<HTMLElement | null>, 'medium length')

			return (
				<div>
					<div
						ref={ref}
						style={{
							width: '140px',
							padding: '0 45px',
							boxSizing: 'border-box',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							font: '16px sans-serif',
						}}
					>
						medium length
					</div>
					<span data-testid="padded">{truncated ? 'truncated' : 'fits'}</span>
				</div>
			)
		}

		const { container } = renderUI(<Padded />)

		// 140px box less 90px of padding leaves a 50px content box; the string is
		// wider than that, so the padding is what decides the answer.
		await waitFor(() =>
			expect(container.querySelector('[data-testid="padded"]')?.textContent).toBe('truncated'),
		)
	})
})
