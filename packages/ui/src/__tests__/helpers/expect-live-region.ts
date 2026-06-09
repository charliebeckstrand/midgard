import { waitFor } from '@testing-library/react'
import { expect } from 'vitest'

/**
 * Assert that the announcer's live region eventually carries the given text.
 * The region is created on demand by `announce`, so this queries the whole
 * document rather than a render container.
 */
export async function expectLiveRegionText(
	text: string,
	politeness: 'polite' | 'assertive' = 'polite',
): Promise<void> {
	await waitFor(() => {
		const region = document.body.querySelector(
			`[data-slot="live-region"][aria-live="${politeness}"]`,
		)

		expect(region).toHaveTextContent(text)
	})
}
