/**
 * Choropleth demo data. A choropleth is three separable pieces — geometry
 * (fetched us-atlas TopoJSON in the demo), tidy value rows joined to it by id,
 * and a colour scale as ordered stops. This file holds the rows and the scales;
 * the consumer owns them, so the chart itself ships no baked-in colour table.
 */

/** One region's datum: `state` joins to a us-atlas feature (by display name); `people` is the metric. */
export type StatePopulation = { state: string; people: number }

/** Resident population by state (2020 census, in millions). */
export const statePopulation: StatePopulation[] = [
	{ state: 'California', people: 39.4 },
	{ state: 'Texas', people: 31.7 },
	{ state: 'Florida', people: 23.5 },
	{ state: 'New York', people: 20.0 },
	{ state: 'Pennsylvania', people: 13.1 },
	{ state: 'Illinois', people: 12.7 },
	{ state: 'Ohio', people: 11.9 },
	{ state: 'Georgia', people: 11.3 },
	{ state: 'North Carolina', people: 11.2 },
	{ state: 'Michigan', people: 10.1 },
	{ state: 'New Jersey', people: 9.5 },
	{ state: 'Virginia', people: 8.9 },
	{ state: 'Washington', people: 8.0 },
	{ state: 'Arizona', people: 7.6 },
	{ state: 'Tennessee', people: 7.3 },
	{ state: 'Massachusetts', people: 7.2 },
	{ state: 'Indiana', people: 7.0 },
	{ state: 'Missouri', people: 6.3 },
	{ state: 'Maryland', people: 6.3 },
	{ state: 'Colorado', people: 6.0 },
	{ state: 'Wisconsin', people: 6.0 },
	{ state: 'Minnesota', people: 5.8 },
	{ state: 'South Carolina', people: 5.6 },
	{ state: 'Alabama', people: 5.2 },
	{ state: 'Louisiana', people: 4.6 },
	{ state: 'Kentucky', people: 4.6 },
	{ state: 'Oregon', people: 4.3 },
	{ state: 'Oklahoma', people: 4.1 },
	{ state: 'Connecticut', people: 3.7 },
	{ state: 'Utah', people: 3.5 },
	{ state: 'Nevada', people: 3.3 },
	{ state: 'Iowa', people: 3.2 },
	{ state: 'Arkansas', people: 3.1 },
	{ state: 'Kansas', people: 3.0 },
	{ state: 'Mississippi', people: 3.0 },
	{ state: 'New Mexico', people: 2.1 },
	{ state: 'Idaho', people: 2.0 },
	{ state: 'Nebraska', people: 2.0 },
	{ state: 'West Virginia', people: 1.8 },
	{ state: 'Hawaii', people: 1.4 },
	{ state: 'New Hampshire', people: 1.4 },
	{ state: 'Maine', people: 1.4 },
	{ state: 'Montana', people: 1.1 },
	{ state: 'Rhode Island', people: 1.1 },
	{ state: 'Delaware', people: 1.1 },
	{ state: 'South Dakota', people: 0.9 },
	{ state: 'North Dakota', people: 0.8 },
	{ state: 'Alaska', people: 0.7 },
	{ state: 'District of Columbia', people: 0.7 },
	{ state: 'Vermont', people: 0.6 },
	{ state: 'Wyoming', people: 0.6 },
]

/**
 * An 'amber' heat scale in Oklch. The stops are perceptually uniform,
 * so the bins are equal-interval and the legend is continuous.
 */
export const heat: string[] = [
	'oklch(0.987 0.022 95.277)',
	'oklch(0.962 0.059 95.617)',
	'oklch(0.924 0.12 95.746)',
	'oklch(0.879 0.169 91.605)',
	'oklch(0.828 0.189 84.429)',
	'oklch(0.769 0.188 70.08)',
	'oklch(0.666 0.179 58.318)',
	'oklch(0.555 0.163 48.998)',
	'oklch(0.473 0.137 46.201)',
	'oklch(0.414 0.112 45.904)',
	'oklch(0.279 0.077 45.635)',
]
