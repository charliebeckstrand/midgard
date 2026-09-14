import { describe, expect, it, vi } from 'vitest'

const rasterizeChartImage = vi.fn()

const downloadBlob = vi.fn()

// Partial: `chartFileName` stays real, because the success payload names the file it
// wrote and the test asserts that name.
vi.mock('../../modules/chart/engine/chart-export', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../modules/chart/engine/chart-export')>()),
	rasterizeChartImage: (...args: unknown[]) => rasterizeChartImage(...args),
	downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}))

import type { ChartExportOutcome } from '../../modules/chart'
import { BarChart } from '../../modules/chart'
import { bySlot, fireEvent, renderUI, screen, waitFor } from '../helpers'

type Row = { quarter: string; revenue: number }

const data: Row[] = [
	{ quarter: 'Q1', revenue: 10 },
	{ quarter: 'Q2', revenue: 20 },
]

const series = [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' } as const]

/** Opens the chart menu and picks one of its download actions. */
function exportImage(onExport: (outcome: ChartExportOutcome) => void, action = 'Download PNG') {
	const { container } = renderUI(
		<BarChart
			aria-label="Revenue by quarter"
			title="Revenue"
			data={data}
			series={[...series]}
			contextMenu={{ onExport }}
		/>,
	)

	const root = bySlot(container, 'chart')

	if (!root) throw new Error('no chart root')

	fireEvent.contextMenu(root)

	fireEvent.click(screen.getByRole('menuitem', { name: action }))
}

describe('Chart export reporting', () => {
	it.each<[string, string, string, string]>([
		['Download PNG', 'image/png', 'revenue.png', 'png'],
		['Download JPG', 'image/jpeg', 'revenue.jpg', 'jpg'],
	])('reports the written file when %s succeeds', async (action, type, fileName) => {
		const blob = new Blob(['x'], { type })

		rasterizeChartImage.mockResolvedValue(blob)

		const onExport = vi.fn()

		exportImage(onExport, action)

		await waitFor(() =>
			expect(onExport).toHaveBeenCalledExactlyOnceWith({ ok: true, type, fileName }),
		)

		expect(downloadBlob).toHaveBeenCalledWith(blob, fileName)
	})

	it('reports the rejection when the rasterise throws', async () => {
		const failure = new Error('tainted canvas')

		rasterizeChartImage.mockRejectedValue(failure)

		const onExport = vi.fn()

		exportImage(onExport)

		await waitFor(() =>
			expect(onExport).toHaveBeenCalledExactlyOnceWith({
				ok: false,
				type: 'image/png',
				error: failure,
			}),
		)

		expect(downloadBlob).not.toHaveBeenCalled()
	})

	// A null blob downloads nothing, so the menu looks like it worked and no file
	// arrives. That is a failure, and it reports as one.
	it('reports a rasterise that yields no blob as a failure', async () => {
		rasterizeChartImage.mockResolvedValue(null)

		const onExport = vi.fn()

		exportImage(onExport)

		await waitFor(() => expect(onExport).toHaveBeenCalledOnce())

		const outcome = onExport.mock.calls[0]?.[0] as ChartExportOutcome

		expect(outcome.ok).toBe(false)

		expect(downloadBlob).not.toHaveBeenCalled()
	})
})
