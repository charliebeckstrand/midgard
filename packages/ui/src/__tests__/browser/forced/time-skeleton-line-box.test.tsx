import { describe, expect, it } from 'vitest'
import { DateTime } from '../../../components/date-time'
import { attach, bySlot, present } from '../../helpers'
import { serverMarkup } from '../../helpers/hydrate'

const VALUE = '2026-11-04T01:00:00Z'

import { eachAuthorScheme } from '../helpers/forced-colors'

/**
 * Forced colors replace the color of text with a system color, and a
 * transparent color too. The UTC text of the skeleton then shows as the time
 * of the reader, with no zone, until hydration. The skeleton keeps its own
 * colors, so its text stays transparent. The line box of the skeleton is
 * `../geometry/time-skeleton-line-box.test.tsx`.
 */
describe('skeleton of a DateTime under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('does not show its UTC text', () => {
			const server = attach(serverMarkup(<DateTime value={VALUE} />))

			const skeleton = present(bySlot(server, 'placeholder'), 'the skeleton')

			expect(getComputedStyle(skeleton).color).toBe('rgba(0, 0, 0, 0)')
		})
	})
})
