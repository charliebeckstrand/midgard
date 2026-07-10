import { describe, expect, it } from 'vitest'
import { ChatChart, parseChatChartSpec } from '../../modules/chat'
import { bySlot, present, renderUI, waitFor } from '../helpers'

const LINE_SPEC = JSON.stringify({
	type: 'line',
	title: 'Signups per week',
	data: [
		{ week: 'W1', signups: 12, churn: 3 },
		{ week: 'W2', signups: 18, churn: 5 },
	],
	series: [
		{ xKey: 'week', yKey: 'signups', yName: 'Signups' },
		{ xKey: 'week', yKey: 'churn', yName: 'Churn' },
	],
})

describe('parseChatChartSpec', () => {
	it('parses the structural core and keeps series objects as-is for passthrough', () => {
		const spec = parseChatChartSpec(
			JSON.stringify({
				type: 'bar',
				data: [{ q: 'Q1', v: 1 }],
				series: [{ xKey: 'q', yKey: 'v', color: 'amber' }],
				stacked: true,
			}),
		)

		expect(spec?.type).toBe('bar')

		expect(spec?.stacked).toBe(true)

		// Fields beyond the validated core (color slots, axis bindings) ride the
		// parsed objects through to the chart.
		expect(spec?.series[0]).toMatchObject({ xKey: 'q', yKey: 'v', color: 'amber' })
	})

	it('drops presentation fields of the wrong type instead of failing the spec', () => {
		const spec = parseChatChartSpec(
			JSON.stringify({
				type: 'line',
				data: [],
				series: [{ xKey: 'x', yKey: 'y' }],
				title: 42,
				stacked: 'yes',
			}),
		)

		expect(spec).not.toBeNull()

		expect(spec?.title).toBeUndefined()

		expect(spec?.stacked).toBeUndefined()
	})

	it.each([
		['malformed JSON', '{"type": "line",'],
		['a non-object payload', '[1, 2, 3]'],
		[
			'an unknown type',
			JSON.stringify({ type: 'sankey', data: [], series: [{ xKey: 'x', yKey: 'y' }] }),
		],
		[
			'non-record data rows',
			JSON.stringify({ type: 'line', data: [1], series: [{ xKey: 'x', yKey: 'y' }] }),
		],
		['an empty series list', JSON.stringify({ type: 'line', data: [], series: [] })],
		[
			'a series missing its keys',
			JSON.stringify({ type: 'line', data: [], series: [{ xKey: 'x' }] }),
		],
	])('rejects %s', (_label, code) => {
		expect(parseChatChartSpec(code)).toBeNull()
	})
})

describe('ChatChart', () => {
	it('renders a valid spec as its chart kind, titled and accessibly named', () => {
		const { container, getByRole } = renderUI(<ChatChart code={LINE_SPEC} />)

		const el = present(bySlot(container, 'chat-chart'), 'chat chart')

		expect(el).toHaveAttribute('data-state', 'chart')

		expect(el).toHaveAttribute('data-type', 'line')

		expect(getByRole('img', { name: 'Signups per week' })).toBeInTheDocument()
	})

	it('falls back to the type name for the accessible name when the spec sets no title', () => {
		const spec = JSON.stringify({
			type: 'bar',
			data: [{ q: 'Q1', v: 1 }],
			series: [{ xKey: 'q', yKey: 'v' }],
		})

		const { getByRole } = renderUI(<ChatChart code={spec} />)

		expect(getByRole('img', { name: 'Bar chart' })).toBeInTheDocument()
	})

	it('renders a settled unparseable spec as a copyable code block', async () => {
		const { container } = renderUI(<ChatChart code={'{"type": "line",'} />)

		const el = present(bySlot(container, 'chat-chart'), 'chat chart')

		expect(el).toHaveAttribute('data-state', 'invalid')

		expect(bySlot(container, 'code-block')).toBeInTheDocument()

		// Let the (mocked) async highlight land before teardown.
		await waitFor(() =>
			expect(container.querySelector('pre.shiki')).toHaveAttribute('data-lang', 'json'),
		)
	})

	it('renders a streaming unparseable spec as a skeleton, not raw source', () => {
		const { container } = renderUI(<ChatChart code={'{"type": "line",'} streaming />)

		const el = present(bySlot(container, 'chat-chart'), 'chat chart')

		expect(el).toHaveAttribute('data-state', 'pending')

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()

		expect(bySlot(container, 'code-block')).not.toBeInTheDocument()
	})

	it('reads only the first series for a pie', () => {
		const spec = JSON.stringify({
			type: 'pie',
			data: [
				{ slice: 'A', share: 3 },
				{ slice: 'B', share: 7 },
			],
			series: [
				{ xKey: 'slice', yKey: 'share' },
				{ xKey: 'slice', yKey: 'ignored' },
			],
		})

		const { container, getByRole } = renderUI(<ChatChart code={spec} />)

		expect(present(bySlot(container, 'chat-chart'), 'chat chart')).toHaveAttribute(
			'data-type',
			'pie',
		)

		expect(getByRole('img', { name: 'Pie chart' })).toBeInTheDocument()
	})
})
