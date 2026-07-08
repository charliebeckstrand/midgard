'use client'

import { Clipboard, Download, Image as ImageIcon, Maximize2, X } from 'lucide-react'
import {
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useState,
} from 'react'
import { Button } from '../../components/button'
import { ContextMenu, type ContextMenuItem } from '../../components/context-menu'
import { Dialog, DialogClose } from '../../components/dialog'
import {
	type ChartImageType,
	chartFileName,
	copyText,
	downloadBlob,
	downloadText,
	rasterizeChartImage,
	readoutToCsv,
} from './chart-export'
import type { ChartContextMenuConfig } from './chart-schema'
import { ChartFullscreenContext } from './context'
import type { ChartReadout } from './types'

/** Props for {@link ChartContextMenu}. @internal */
export type ChartContextMenuProps = {
	/**
	 * The caller's configuration: custom items, whether to keep the defaults,
	 * where the custom block sits, and whether image downloads keep the legend.
	 * `false` suppresses the menu; `undefined` shows the defaults alone.
	 */
	contextMenu: ChartContextMenuConfig | false | undefined
	/** The chart root, read on an image-export action to rasterise the whole chart. */
	rootRef: RefObject<HTMLDivElement | null>
	/** The values behind the marks, backing the CSV actions; `null` drops them. */
	readout: ChartReadout | null
	/** The chart title, naming the fullscreen dialog and seeding export filenames. */
	title?: string
	/**
	 * A fresh, re-mountable copy of the chart, rendered large in the fullscreen
	 * dialog so hover and keyboard keep working — the chart re-measures at the
	 * dialog size rather than scaling a still. Absent, the Fullscreen item drops.
	 */
	fullscreen?: ReactElement
	/** The chart, wrapped as the right-click surface. */
	children: ReactNode
}

/** Sizes the fullscreen chart to the largest box of its ratio that fits the dialog, centered. @internal */
const FULLSCREEN_CHART_CLASS = 'max-h-full w-full max-w-[calc(100cqh*16/9)]'

/**
 * The chart family's right-click menu and fullscreen view. Wraps a chart in a
 * {@link ContextMenu} whose default actions — Fullscreen, Download PNG / JPG, and
 * (with a readout) Download CSV / Copy data — merge with any caller
 * {@link ChartContextMenuConfig}. Fullscreen opens a large dialog holding a live,
 * re-mounted copy of the chart, centered at its aspect ratio; image downloads
 * rasterise the whole chart, legend included, unless `downloadLegend` is off.
 *
 * @remarks Image export draws the chart through an SVG `foreignObject` so its
 * HTML chrome and SVG marks capture together, inlining computed styles so the
 * bitmap carries its colours. `contextMenu={false}` renders the chart untouched,
 * leaving the browser's native menu.
 *
 * @internal
 */
export function ChartContextMenu({
	contextMenu,
	rootRef,
	readout,
	title,
	fullscreen,
	children,
}: ChartContextMenuProps) {
	const [open, setOpen] = useState(false)

	if (contextMenu === false) return <>{children}</>

	const includeLegend = contextMenu?.downloadLegend ?? true

	const exportImage = async (type: ChartImageType, extension: string): Promise<void> => {
		const root = rootRef.current

		if (!root) return

		try {
			const blob = await rasterizeChartImage(root, { type, includeLegend })

			if (blob) downloadBlob(blob, chartFileName(title, extension))
		} catch {
			// A failed rasterise (image decode) has no retry affordance to drive.
		}
	}

	const imageActions: ContextMenuItem[] = [
		...(fullscreen
			? [
					{
						key: 'fullscreen',
						label: 'Fullscreen',
						icon: <Maximize2 />,
						onSelect: () => setOpen(true),
					} satisfies ContextMenuItem,
				]
			: []),
		{
			key: 'download-png',
			label: 'Download PNG',
			icon: <ImageIcon />,
			onSelect: () => void exportImage('image/png', 'png'),
		},
		{
			key: 'download-jpg',
			label: 'Download JPG',
			icon: <ImageIcon />,
			onSelect: () => void exportImage('image/jpeg', 'jpg'),
		},
	]

	const dataActions: ContextMenuItem[] = readout
		? [
				{
					key: 'download-csv',
					label: 'Download CSV',
					icon: <Download />,
					onSelect: () =>
						downloadText(readoutToCsv(readout), chartFileName(title, 'csv'), 'text/csv'),
				},
				{
					key: 'copy-data',
					label: 'Copy data',
					icon: <Clipboard />,
					onSelect: () => copyText(readoutToCsv(readout)),
				},
			]
		: []

	const defaults = [...imageActions, ...dataActions]

	return (
		<>
			<ContextMenu
				defaults={defaults}
				items={contextMenu?.items}
				defaultItems={contextMenu?.defaultItems}
				position={contextMenu?.position}
			>
				{children}
			</ContextMenu>

			<Dialog
				open={open}
				onOpenChange={setOpen}
				size="full"
				aria-label={title ?? 'Chart'}
				className="flex h-[calc(100dvh-2rem)] flex-col"
			>
				<div data-slot="chart-fullscreen-bar" className="flex justify-end">
					<DialogClose>
						<Button variant="bare" aria-label="Close fullscreen">
							<X />
						</Button>
					</DialogClose>
				</div>

				<div
					data-slot="chart-fullscreen"
					className="flex min-h-0 flex-1 items-center justify-center [container-type:size]"
				>
					{open && isValidElement(fullscreen) && (
						<ChartFullscreenContext value={true}>
							{cloneElement(fullscreen as ReactElement<Record<string, unknown>>, {
								width: undefined,
								height: undefined,
								className: FULLSCREEN_CHART_CLASS,
							})}
						</ChartFullscreenContext>
					)}
				</div>
			</Dialog>
		</>
	)
}
