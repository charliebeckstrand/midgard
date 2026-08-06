import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { useIsTruncated } from '../../../hooks'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI, screen } from '../../helpers'

/**
 * The reveal half of a truncating footer summary, against the real floating
 * engine and real layout: the jsdom suite can't see overflow and mocks
 * `@floating-ui/react`, so a hover tooltip only surfaces here. The clip half is
 * `browser/grid-footer-content-truncate`.
 *
 * `GridFooter.content` is a consumer slot, so this asserts the composition it
 * documents rather than a component of its own: a `truncate` label gated on
 * {@link useIsTruncated}, which is also the arrangement that puts `block` up
 * against the `inline-flex` {@link TooltipTrigger} clones onto its child.
 */
describe('grid footer content truncation tooltip (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	const rows: Row[] = [{ id: 1, name: 'Name 1' }]

	const LONG =
		'Carrier is one of ACME Freight Systems, Blue Ridge Logistics, Continental Cartage Group and 14 more'

	it('reveals the full label on hover when the summary is clipped', async () => {
		await page.viewport(960, 640)

		renderFooter(LONG)

		await userEvent.hover(screen.getByTestId('label'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)
	})

	it('opens no tooltip on a summary that fits the bar', async () => {
		await page.viewport(960, 640)

		renderFooter('Carrier is ACME')

		await userEvent.hover(screen.getByTestId('label'))

		// The tooltip would open at the 250ms hover delay if enabled; wait past it
		// (no pointer-leave to cancel) and assert none surfaced.
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.queryByRole('tooltip')).toBeNull()
	})

	/** The consumer composition: a clipping label beside a pinned figure. */
	function Summary({ label }: { label: string }) {
		const labelRef = useRef<HTMLSpanElement>(null)

		const truncated = useIsTruncated(labelRef, label)

		return (
			<span className="flex min-w-0 items-center gap-1">
				<Tooltip enabled={truncated}>
					<TooltipTrigger>
						<span ref={labelRef} data-testid="label" className="block truncate">
							{label}
						</span>
					</TooltipTrigger>
					<TooltipContent>{label}</TooltipContent>
				</Tooltip>
				<span className="shrink-0 whitespace-nowrap">· $1,284,900 total spend</span>
			</span>
		)
	}

	function renderFooter(label: string) {
		return renderUI(
			<div style={{ width: '360px' }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					footer={{ rowTotal: true, content: () => <Summary label={label} /> }}
				/>
			</div>,
		)
	}
})
