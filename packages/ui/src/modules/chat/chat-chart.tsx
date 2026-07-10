'use client'

import { useMemo } from 'react'
import { CodeBlock } from '../../components/code'
import { AreaChart } from '../chart/area-chart'
import { BarChart } from '../chart/bar-chart'
import type { PieChartSeries, ScatterChartSeries } from '../chart/chart-schema'
import { ChartSkeleton } from '../chart/chart-skeleton'
import { DonutChart } from '../chart/donut-chart'
import { LineChart } from '../chart/line-chart'
import { PieChart } from '../chart/pie-chart'
import { ScatterChart } from '../chart/scatter-chart'

/** The chart kinds a {@link ChatChartSpec} can name. */
const CHAT_CHART_TYPES = ['line', 'area', 'bar', 'pie', 'donut', 'scatter'] as const

/** A {@link ChatChartSpec}'s chart kind. */
export type ChatChartType = (typeof CHAT_CHART_TYPES)[number]

/**
 * One row of a {@link ChatChartSpec}'s dataset. Fields are whatever the spec's
 * series key into; the chart module reads them defensively (a value that fails
 * `Number(…)` drops its mark, never the chart), so ragged agent-generated rows
 * degrade to the points that parse.
 */
export type ChatChartDatum = Record<string, unknown>

/**
 * One series of a {@link ChatChartSpec}: the field keys the chart reads,
 * mirroring the chart module's series shape ({@link ChartSeries}). Extra
 * fields the JSON carries (`color`, `axis`, …) pass through to the chart
 * untouched.
 */
export type ChatChartSeries = {
	/** The field holding each row's category (or numeric x, for `scatter`). */
	xKey: string
	/** The field holding this series' numeric value. */
	yKey: string
	/** Legend and tooltip name. @defaultValue the `yKey` field name */
	yName?: string
}

/**
 * The JSON payload of a ```` ```chart ```` fence: which chart to draw and the
 * data to draw it from. The minimum viable spec is `type`, `data`, and
 * `series`; everything else refines presentation.
 */
export type ChatChartSpec = {
	/** Which chart kind to render. */
	type: ChatChartType
	/** The dataset, one row per category (or point). */
	data: ChatChartDatum[]
	/** The series to plot; `pie` / `donut` read only the first. */
	series: ChatChartSeries[]
	/** Heading drawn above the plot; also the chart's accessible name. */
	title?: string
	/** Muted subheading under the title. */
	subtitle?: string
	/** Pile a `bar` chart's series into one part-to-whole column per category. */
	stacked?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isChatChartType(value: unknown): value is ChatChartType {
	return typeof value === 'string' && (CHAT_CHART_TYPES as readonly string[]).includes(value)
}

function isChatChartSeries(value: unknown): value is ChatChartSeries {
	return isRecord(value) && typeof value.xKey === 'string' && typeof value.yKey === 'string'
}

/**
 * Parse a ```` ```chart ```` fence body into a {@link ChatChartSpec}, or
 * `null` for anything that isn't one — malformed JSON (an in-flight streamed
 * fence), an unknown `type`, or `data` / `series` that aren't arrays of the
 * required shape. Presentation fields of the wrong type are dropped rather
 * than failing the spec; only the structural core is load-bearing.
 */
export function parseChatChartSpec(code: string): ChatChartSpec | null {
	let parsed: unknown

	try {
		parsed = JSON.parse(code)
	} catch {
		return null
	}

	if (!isRecord(parsed)) return null

	if (!isChatChartType(parsed.type)) return null

	if (!Array.isArray(parsed.data) || !parsed.data.every(isRecord)) return null

	if (
		!Array.isArray(parsed.series) ||
		parsed.series.length === 0 ||
		!parsed.series.every(isChatChartSeries)
	) {
		return null
	}

	return {
		type: parsed.type,
		data: parsed.data,
		series: parsed.series,
		title: typeof parsed.title === 'string' ? parsed.title : undefined,
		subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle : undefined,
		stacked: typeof parsed.stacked === 'boolean' ? parsed.stacked : undefined,
	}
}

/** Accessible-name fallback per chart kind, for a spec that sets no `title`. */
const FALLBACK_LABEL: Record<ChatChartType, string> = {
	line: 'Line chart',
	area: 'Area chart',
	bar: 'Bar chart',
	pie: 'Pie chart',
	donut: 'Donut chart',
	scatter: 'Scatter chart',
}

/** Props for {@link ChatChart}. */
export type ChatChartProps = {
	/** The fence body: a {@link ChatChartSpec} as JSON. */
	code: string
	/**
	 * The message is still streaming in, so an unparseable `code` is presumed
	 * in-flight and shows a {@link ChartSkeleton} instead of the raw source.
	 */
	streaming?: boolean
	className?: string
}

/**
 * A chart module rendered from a chat message's ```` ```chart ```` fence:
 * parses `code` as a {@link ChatChartSpec} and draws the matching chart —
 * fully interactive, with its legend, tooltip, keyboard navigation, and
 * hidden data table.
 *
 * @remarks
 * Degrades instead of throwing: while `streaming`, an unparseable spec is an
 * in-flight fence and renders a {@link ChartSkeleton} that the finished chart
 * replaces in place; settled, it renders the raw JSON as a {@link CodeBlock},
 * so a malformed spec stays legible (and copyable) rather than vanishing. The
 * spec is data-only — fields are whitelisted onto the chart's props, so fence
 * JSON can never inject markup or reach arbitrary props.
 */
export function ChatChart({ code, streaming, className }: ChatChartProps) {
	const spec = useMemo(() => parseChatChartSpec(code), [code])

	if (!spec) {
		return (
			<div
				data-slot="chat-chart"
				data-state={streaming ? 'pending' : 'invalid'}
				className={className}
			>
				{streaming ? <ChartSkeleton /> : <CodeBlock code={code} lang="json" />}
			</div>
		)
	}

	const label = spec.title ?? FALLBACK_LABEL[spec.type]

	const shared = {
		'aria-label': label,
		data: spec.data,
		title: spec.title,
		subtitle: spec.subtitle,
	}

	return (
		<div data-slot="chat-chart" data-state="chart" data-type={spec.type} className={className}>
			{spec.type === 'line' && <LineChart {...shared} series={spec.series} />}
			{spec.type === 'area' && <AreaChart {...shared} series={spec.series} />}
			{spec.type === 'bar' && <BarChart {...shared} series={spec.series} stacked={spec.stacked} />}
			{spec.type === 'pie' && (
				<PieChart {...shared} series={[spec.series[0] as PieChartSeries<ChatChartDatum>]} />
			)}
			{spec.type === 'donut' && (
				<DonutChart {...shared} series={[spec.series[0] as PieChartSeries<ChatChartDatum>]} />
			)}
			{spec.type === 'scatter' && (
				<ScatterChart {...shared} series={spec.series as ScatterChartSeries<ChatChartDatum>[]} />
			)}
		</div>
	)
}
