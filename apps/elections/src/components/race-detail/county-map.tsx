'use client'

import { useMemo } from 'react'
import { MapPlat } from 'ui/map'
import { useCountyShapes } from '../../queries/county-queries'
import type { CountyResult } from '../../types'
import { countyWinner, WINNER_CATEGORIES } from '../../utilities/results'

/** Props for {@link CountyMap}. */
export type CountyMapProps = {
	/** The name of the race, for the label of the map, such as `Georgia Senate`. */
	label: string
	/** The lowercase postal code of the state of the race. */
	state: string
	/** The counties of the race, or `undefined` while the race loads. */
	counties: readonly CountyResult[] | undefined
	/** Opens a county of the race, by its FIPS code. */
	onCounty: (fips: string) => void
}

/** One county of the map: its FIPS code and its category. */
type CountyRow = { fips: string; winner: string }

/**
 * The counties of a race on a map of its state, colored by the side that leads
 * each county. A district race draws only the counties of the district. A click
 * on a county opens it. The shapes load when the map first shows, so it is the
 * entry of a lazy chunk.
 */
export function CountyMap({ label, state, counties, onCounty }: CountyMapProps) {
	const shapes = useCountyShapes(state)

	const rows = useMemo(
		() =>
			(counties ?? []).flatMap((county): CountyRow[] => {
				const winner = countyWinner(county)

				return winner === null ? [] : [{ fips: county.fips, winner }]
			}),
		[counties],
	)

	// The shapes of the counties of the race: all of the state, or the counties of a district.
	const geography = useMemo(() => {
		if (shapes.data === undefined || counties === undefined) return null

		const raced = new Set(counties.map((county) => county.fips))

		return {
			...shapes.data,
			features: shapes.data.features.filter((shape) => raced.has(String(shape.id))),
		}
	}, [shapes.data, counties])

	const present = new Set(rows.map((row) => row.winner))

	const counted = new Set(counties?.map((county) => county.fips))

	return (
		<MapPlat
			aria-label={`${label} results by county`}
			geography={geography}
			projection="identity"
			regionKey="fips"
			onRegionClick={(fips: string) => {
				if (counted.has(fips)) onCounty(fips)
			}}
			data={rows}
			categoryKey="winner"
			colorName="Leader"
			categories={WINNER_CATEGORIES.filter((category) => present.has(category.value))}
		/>
	)
}
