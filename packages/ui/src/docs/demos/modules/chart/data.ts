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
	{ state: 'California', people: 39.5 },
	{ state: 'Texas', people: 29.1 },
	{ state: 'Florida', people: 21.5 },
	{ state: 'New York', people: 20.2 },
	{ state: 'Pennsylvania', people: 13.0 },
	{ state: 'Illinois', people: 12.8 },
	{ state: 'Ohio', people: 11.8 },
	{ state: 'Georgia', people: 10.7 },
	{ state: 'North Carolina', people: 10.4 },
	{ state: 'Michigan', people: 10.0 },
	{ state: 'New Jersey', people: 9.3 },
	{ state: 'Virginia', people: 8.6 },
	{ state: 'Washington', people: 7.7 },
	{ state: 'Arizona', people: 7.2 },
	{ state: 'Massachusetts', people: 7.0 },
	{ state: 'Tennessee', people: 6.9 },
	{ state: 'Indiana', people: 6.8 },
	{ state: 'Missouri', people: 6.2 },
	{ state: 'Maryland', people: 6.2 },
	{ state: 'Wisconsin', people: 5.9 },
	{ state: 'Colorado', people: 5.8 },
	{ state: 'Minnesota', people: 5.7 },
	{ state: 'South Carolina', people: 5.1 },
	{ state: 'Alabama', people: 5.0 },
	{ state: 'Louisiana', people: 4.7 },
	{ state: 'Kentucky', people: 4.5 },
	{ state: 'Oregon', people: 4.2 },
	{ state: 'Oklahoma', people: 4.0 },
	{ state: 'Connecticut', people: 3.6 },
	{ state: 'Utah', people: 3.3 },
	{ state: 'Iowa', people: 3.2 },
	{ state: 'Nevada', people: 3.1 },
	{ state: 'Arkansas', people: 3.0 },
	{ state: 'Mississippi', people: 3.0 },
	{ state: 'Kansas', people: 2.9 },
	{ state: 'New Mexico', people: 2.1 },
	{ state: 'Nebraska', people: 2.0 },
	{ state: 'Idaho', people: 1.8 },
	{ state: 'West Virginia', people: 1.8 },
	{ state: 'Hawaii', people: 1.5 },
	{ state: 'New Hampshire', people: 1.4 },
	{ state: 'Maine', people: 1.4 },
	{ state: 'Montana', people: 1.1 },
	{ state: 'Rhode Island', people: 1.1 },
	{ state: 'Delaware', people: 1.0 },
	{ state: 'South Dakota', people: 0.9 },
	{ state: 'North Dakota', people: 0.8 },
	{ state: 'Alaska', people: 0.7 },
	{ state: 'Vermont', people: 0.6 },
	{ state: 'Wyoming', people: 0.6 },
]

/**
 * A warm heat scale, low → high (so the legend reads red at the top): white →
 * yellow → amber → orange → red.
 */
export const heat: string[] = ['#ffffff', '#facc15', '#f59e0b', '#f97316', '#dc2626']
