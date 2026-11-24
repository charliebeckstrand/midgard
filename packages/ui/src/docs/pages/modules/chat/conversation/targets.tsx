import { BarChart } from 'ui/chart'
import type { ChatCitation, ChatCitationTargets } from 'ui/chat'

/** The late stops of one day, on the north and the south routes. */
export type LateDay = { day: string; north: number; south: number }

/** The data behind a citation of the trend, as the reply sends it. */
type Trend = { days: LateDay[] }

/**
 * The views that a citation of the reply opens. The reply sends the data
 * behind the phrase in the `selector` of the citation, and the chart draws it.
 */
export const targets = {
	'late-trend': {
		label: 'Late stops by day',
		render: (citation: ChatCitation) => (
			<BarChart
				aria-label="Late stops by day"
				data={(citation.selector as Trend).days}
				series={[
					{ xKey: 'day', yKey: 'north', yName: 'North routes' },
					{ xKey: 'day', yKey: 'south', yName: 'South routes' },
				]}
				stacked
			/>
		),
	},
} satisfies ChatCitationTargets
