// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'

/**
 * The server markup of an animated BarChart with a fixed size.
 *
 * The server cannot read the reduced-motion preference of the reader, so the
 * marks render at rest there, as the line and the points do. A bar that the
 * server renders at its `initial` scale of zero is invisible until the motion
 * features load in the browser. The suite renders with the real motion, so it
 * sits in the node project, which has no module doubles.
 */
const DATA = [
	{ q: 'Q1', v: 10 },
	{ q: 'Q2', v: 30 },
]

/** The `style` of each `chart-bar` path in the markup. */
function barStyles(markup: string): string[] {
	return [...markup.matchAll(/<path data-slot="chart-bar"[^>]*?style="([^"]*)"/g)].map(
		(match) => match[1] ?? '',
	)
}

describe('animated BarChart server markup', () => {
	it.each(['vertical', 'horizontal'] as const)(
		'renders the %s bars at full size',
		(orientation) => {
			const markup = renderToString(
				<BarChart
					aria-label="Revenue"
					data={DATA}
					series={[{ xKey: 'q', yKey: 'v' }]}
					orientation={orientation}
					width={400}
					height={200}
					animate
				/>,
			)

			const styles = barStyles(markup)

			// The count is live, so the check below can fail.
			expect(styles.length).toBeGreaterThan(0)

			expect(styles.filter((style) => /scale[XY]\(0\)/.test(style))).toEqual([])
		},
	)
})
