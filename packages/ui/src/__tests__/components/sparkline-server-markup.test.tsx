// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Sparkline } from '../../components/sparkline'

/**
 * The server markup of an animated sparkline. The server reads reduced motion,
 * so each mark is at rest: the marks are visible before the script loads, and
 * they do not reveal again after hydration.
 */
describe('Sparkline server markup', () => {
	it('renders every animated mark at rest, the area wash included', () => {
		const markup = renderToString(
			<Sparkline data={[1, 4, 2, 8, 5]} animate fill endPoint aria-label="Revenue trend" />,
		)

		expect(markup).toContain('fill-opacity="0.16"')

		expect(markup).not.toContain('opacity:0')
	})
})
