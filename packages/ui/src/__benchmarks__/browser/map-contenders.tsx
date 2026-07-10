/**
 * One mount/update/destroy adapter per library for the map scenarios — the
 * chart contenders' contract over geographic drawing: the ui module renders
 * through React (`createRoot` + `flushSync`), Highcharts Maps and ECharts
 * through their vanilla factories. AG Charts sits this suite out: its map
 * series is enterprise-only, so the community package the chart benches run
 * has nothing to enter.
 *
 * Every contender draws the same prepared `us-atlas` geometry (see
 * `map-fixtures.ts`) into the same fixed 800×450 box with animations off, and
 * joins the same rows by FIPS id. Projections are each library's US idiom:
 * the ui module's `albers-usa` composite, Highcharts' Lambert conformal conic
 * (its own custom-US-map guidance), and that same conic for ECharts through
 * its documented d3-geo projection hook — ECharts ships no US projection of
 * its own.
 *
 * ECharts paints through zrender's animation-frame loop, so its adapter
 * flushes the pending frame synchronously (`getZr().flush()`) after every
 * option set — without it the timed region would end at scene-graph
 * bookkeeping, before any pixels, the way an unawaited AG chart would.
 */

import { geoConicConformal } from 'd3-geo'
import * as echarts from 'echarts'
import Highcharts from 'highcharts'
import 'highcharts/modules/map'
import { MapPlat } from '../../modules/map/map-plat'
import type { MapCategory } from '../../modules/map/types'
import { type Contender, HEIGHT, hcContender, reactContender, WIDTH } from './contenders'
import {
	type JoinRow,
	type MapAtlas,
	type NamedRow,
	VALUE_MAX,
	VALUE_RAMP,
	type ValueData,
	ZONE_COLORS,
	ZONES,
	type ZoneData,
} from './map-fixtures'

/**
 * Explicit category order for the ui module, matching the fixed data classes
 * and pieces the rivals take, so an update recolours regions rather than also
 * re-deriving (and possibly reordering) the legend from the new rows.
 */
const UI_CATEGORIES: MapCategory[] = ZONES.map((zone) => ({ value: zone }))

/** Highcharts' custom-US-map projection: the Lambert conformal conic over the lower 48. */
const HC_PROJECTION = {
	projection: { name: 'LambertConformalConic', parallels: [33, 45], rotation: [96] },
}

// ECharts draws a registered map by name; register each prepared atlas once.
const registered = new Set<string>()

function ecMapName(atlas: MapAtlas): string {
	if (!registered.has(atlas.name)) {
		echarts.registerMap(atlas.name, atlas.geoJson as Parameters<typeof echarts.registerMap>[1])

		registered.add(atlas.name)
	}

	return atlas.name
}

/**
 * The same Lambert conformal conic Highcharts runs, handed to ECharts through
 * its documented d3-geo projection hook. d3 emits screen-oriented y (down),
 * the orientation ECharts' own projection examples produce.
 */
function conicProjection() {
	const conic = geoConicConformal().parallels([33, 45]).rotate([96, 0])

	const point = (projected: [number, number] | null): [number, number] =>
		projected ?? [Number.NaN, Number.NaN]

	return {
		project: (position: [number, number]) => point(conic(position)),
		unproject: (position: [number, number]) => point(conic.invert?.(position) ?? null),
	}
}

/** Forces zrender's frame-deferred paint, so the timed region covers pixels. */
function flushFrame(chart: echarts.ECharts) {
	chart.getZr().flush()
}

/** Creates an ECharts map and flushes its paint; updates merge a new option in. */
function ecContender<D>(
	name: string,
	option: (data: D) => echarts.EChartsOption,
	update: (data: D) => echarts.EChartsOption,
): Contender<D> {
	return {
		name,
		mount(host, data) {
			const chart = echarts.init(host, null, { width: WIDTH, height: HEIGHT })

			chart.setOption({ animation: false, ...option(data) })

			flushFrame(chart)

			return {
				update(next) {
					chart.setOption(update(next))

					flushFrame(chart)
				},
				destroy: () => chart.dispose(),
			}
		},
	}
}

/** The Highcharts data rows, through the loose point type its `joinBy` join reads. */
function hcData(rows: object[]): Highcharts.PointOptionsObject[] {
	return rows as Highcharts.PointOptionsObject[]
}

/**
 * A Highcharts US map contender over one prepared atlas: the shared chart /
 * projection / FIPS-joined series and its in-place data update, leaving only
 * the colour scale (a zone data-class set, or a choropleth ramp) per scenario.
 * Built through the shared {@link hcContender} with `Highcharts.mapChart` as
 * the factory — the topology rides in `chart.map`, which its base-block merge
 * preserves.
 */
function hcUsMapContender<D extends { hcRows: JoinRow[] }>(
	seriesName: string,
	atlas: MapAtlas,
	colorAxis: Highcharts.ColorAxisOptions,
): Contender<D> {
	return hcContender<D>(
		'Highcharts map',
		(data) => ({
			chart: { map: atlas.topology as unknown as Highcharts.GeoJSON },
			mapView: HC_PROJECTION,
			colorAxis,
			series: [
				{ type: 'map', name: seriesName, data: hcData(data.hcRows), joinBy: ['fips', 'fips'] },
			],
		}),
		(chart, data) => {
			chart.series[0]?.setData(hcData(data.hcRows), false, false)
		},
		Highcharts.mapChart,
	)
}

/**
 * The shared ECharts map series: the prepared atlas by name, the FIPS
 * name-join, and the same Lambert conic the other contenders run. Every map
 * scenario's series is this shape — an option or emphasis variant spreads it.
 */
function ecMapSeries(atlas: MapAtlas, data: NamedRow[]) {
	return {
		type: 'map' as const,
		map: ecMapName(atlas),
		nameProperty: 'fips',
		projection: conicProjection(),
		data,
	}
}

/** An update that recolours the ECharts map in place — the same merge for zone and choropleth. */
function ecDataUpdate(data: { ecRows: NamedRow[] }): echarts.EChartsOption {
	return { series: [{ data: data.ecRows }] }
}

/**
 * The ECharts categorical zone option: the piecewise visual map keyed to the
 * fixed zone classes plus the shared map series. `emphasis` spreads
 * `focus: 'self'` into the series — its documented recede — for the
 * legend-emphasis bench, off the default the mount / update / hover scenarios
 * measure.
 */
function ecZoneOption(atlas: MapAtlas, data: ZoneData, emphasis = false): echarts.EChartsOption {
	const series = ecMapSeries(atlas, data.ecRows)

	return {
		tooltip: {},
		visualMap: {
			type: 'piecewise',
			pieces: ZONES.map((zone, index) => ({
				value: index,
				label: zone,
				color: ZONE_COLORS[index],
			})),
		},
		// `emphasis.focus: 'self'` is a documented map option ECharts' published
		// types omit; the cast keeps the runtime behaviour its `setOption` accepts.
		series: [emphasis ? ({ ...series, emphasis: { focus: 'self' } } as typeof series) : series],
	}
}

/** The ECharts numeric choropleth option: a continuous visual map over the ramp plus the shared series. */
function ecChoroplethOption(atlas: MapAtlas, data: ValueData): echarts.EChartsOption {
	return {
		tooltip: {},
		visualMap: { min: 0, max: VALUE_MAX, inRange: { color: VALUE_RAMP } },
		series: [ecMapSeries(atlas, data.ecRows)],
	}
}

/**
 * An ECharts zone map for the legend-emphasis bench: the shared categorical
 * option plus `emphasis.focus: 'self'` — its documented recede, where entering
 * emphasis blurs everything else — kept off the shared contenders so the
 * mount / update / hover scenarios measure the default configuration. Returns
 * the chart instance: the emphasis bench drives `dispatchAction`
 * highlight / downplay on it, ECharts' programmatic equivalent of its
 * visual-map hover link.
 */
export function ecZoneEmphasisChart(
	host: HTMLElement,
	atlas: MapAtlas,
	data: ZoneData,
): echarts.ECharts {
	const chart = echarts.init(host, null, { width: WIDTH, height: HEIGHT })

	chart.setOption({ animation: false, ...ecZoneOption(atlas, data, true) })

	flushFrame(chart)

	return chart
}

/** Categorical zone contenders over one prepared atlas. */
export function zoneMapContenders(atlas: MapAtlas): Contender<ZoneData>[] {
	return [
		reactContender('ui MapPlat', (data) => (
			<MapPlat
				aria-label="Bench map"
				geography={atlas.topology}
				projection="albers-usa"
				data={data.rows}
				regionKey="fips"
				categoryKey="zone"
				categories={UI_CATEGORIES}
				width={WIDTH}
				height={HEIGHT}
			/>
		)),
		hcUsMapContender<ZoneData>('Zones', atlas, {
			dataClasses: ZONES.map((zone, index) => ({
				from: index,
				to: index,
				name: zone,
				color: ZONE_COLORS[index],
			})),
		}),
		ecContender<ZoneData>('ECharts map', (data) => ecZoneOption(atlas, data), ecDataUpdate),
	]
}

/** Numeric choropleth contenders over one prepared atlas. */
export function choroplethMapContenders(atlas: MapAtlas): Contender<ValueData>[] {
	return [
		reactContender('ui MapPlat', (data) => (
			<MapPlat
				aria-label="Bench map"
				geography={atlas.topology}
				projection="albers-usa"
				data={data.rows}
				regionKey="fips"
				valueKey="value"
				colorRange={VALUE_RAMP}
				domain={[0, VALUE_MAX]}
				width={WIDTH}
				height={HEIGHT}
			/>
		)),
		hcUsMapContender<ValueData>('Values', atlas, {
			min: 0,
			max: VALUE_MAX,
			stops: VALUE_RAMP.map(
				(color, index) => [index / (VALUE_RAMP.length - 1), color] as [number, string],
			),
		}),
		ecContender<ValueData>('ECharts map', (data) => ecChoroplethOption(atlas, data), ecDataUpdate),
	]
}
