import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { DateTime } from '../../../components/date-time'
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from '../../../components/description-list'
import { TimeAgo } from '../../../components/time-ago'
import { attach, renderUI } from '../../helpers'
import { serverMarkup } from '../../helpers/hydrate'

/**
 * The server markup of a DateTime with no zone, and of a TimeAgo, holds a
 * skeleton in place of the text. The line is an empty box, so it has no
 * baseline. Its bottom edge sits on the baseline of the text, and the line box
 * then also holds the descent of the text. The row was 6 px taller than the
 * text that replaced it. Thus a panel that fits its content changed its height
 * after hydration. These tests hold the row at the height of the text, in the
 * server markup and after the mount.
 */
const VALUE = '2026-11-04T01:00:00Z'

const times: { name: string; time: ReactElement }[] = [
	{
		name: 'DateTime',
		time: <DateTime value={VALUE} format={{ dateStyle: 'medium', timeStyle: 'short' }} />,
	},
	{ name: 'TimeAgo', time: <TimeAgo value={VALUE} /> },
]

function row(time: ReactElement) {
	return (
		<div className="w-[400px]">
			<DescriptionList>
				<DescriptionTerm>Polls closed</DescriptionTerm>
				<DescriptionDetails data-testid="details">{time}</DescriptionDetails>
			</DescriptionList>
			<p data-testid="line" className="text-base/7">
				Updated {time}
			</p>
		</div>
	)
}

function heights(container: HTMLElement) {
	const height = (id: string) => {
		const node = container.querySelector(`[data-testid="${id}"]`)

		return node ? node.getBoundingClientRect().height : -1
	}

	return { details: height('details'), line: height('line') }
}

describe('skeleton line of a time (real browser)', () => {
	it.each(times)('$name keeps the height of its text in the server markup', ({ time }) => {
		const server = attach(serverMarkup(row(time)))

		expect(server.querySelector('[data-slot="placeholder"]')).not.toBeNull()

		const settled = renderUI(row(time))

		expect(settled.container.querySelector('[data-slot="placeholder"]')).toBeNull()

		const shown = heights(settled.container)

		expect(shown.details).toBeGreaterThan(0)

		expect(heights(server)).toEqual(shown)
	})
})

/**
 * The skeleton of a DateTime holds the date in UTC as text that does not show.
 * The test browser runs in UTC, so the skeleton and the text have the same size.
 * A skeleton of an estimated width was wider than a short time, and in a narrow
 * column it held one line where the text breaks into more lines. The row then
 * changed its size after hydration.
 */
describe('skeleton of a DateTime (real browser)', () => {
	const sizes = [
		{ name: 'a short time in a wide row', width: 400, format: { timeStyle: 'short' } },
		{
			name: 'a long date in a narrow column',
			width: 80,
			format: { dateStyle: 'medium', timeStyle: 'short' },
		},
	] as const

	it.each(sizes)('has the size of its text: $name', ({ width, format }) => {
		const cell = (
			<div style={{ width }} className="text-base/6">
				<DateTime value={VALUE} format={format} data-testid="time" />
			</div>
		)

		const box = (container: HTMLElement) => {
			const rect = container.querySelector('[data-testid="time"]')?.getBoundingClientRect()

			return rect ? { width: rect.width, height: rect.height } : null
		}

		const server = attach(serverMarkup(cell))

		expect(server.querySelector('[data-slot="placeholder"]')).not.toBeNull()

		const settled = renderUI(cell)

		expect(settled.container.querySelector('[data-slot="placeholder"]')).toBeNull()

		expect(box(server)).toEqual(box(settled.container))
	})
})
