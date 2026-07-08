'use client'

import { Clipboard, Copy, Download, Image as ImageIcon, Maximize2, X } from 'lucide-react'
import { type ReactNode, type RefObject, useState } from 'react'
import { Button } from '../../components/button'
import {
	ContextMenu,
	type ContextMenuConfig,
	type ContextMenuItem,
} from '../../components/context-menu'
import { Dialog, DialogClose, DialogTitle } from '../../components/dialog'
import {
	type ChartImageType,
	canCopyImage,
	captureChartSnapshot,
	chartFileName,
	copyImage,
	copyText,
	downloadBlob,
	downloadText,
	rasterizeChartSvg,
	readoutToCsv,
} from './chart-export'
import type { ChartReadout } from './types'

/** Props for {@link ChartContextMenu}. @internal */
export type ChartContextMenuProps = {
	/**
	 * The caller's configuration: custom items, whether to keep the defaults, and
	 * where the custom block sits. `false` suppresses the menu entirely;
	 * `undefined` shows the defaults alone.
	 */
	contextMenu: ContextMenuConfig | false | undefined
	/** The chart root, read on an action for its `<svg>` (image export) and cloned for fullscreen. */
	rootRef: RefObject<HTMLDivElement | null>
	/** The values behind the marks, backing the CSV actions; `null` drops them. */
	readout: ChartReadout | null
	/** The chart title, naming the fullscreen dialog and seeding export filenames. */
	title?: string
	/** The chart, wrapped as the right-click surface. */
	children: ReactNode
}

/**
 * The chart family's right-click menu and fullscreen view. Wraps a chart in a
 * {@link ContextMenu} whose default actions — Fullscreen, Download PNG / JPG,
 * Copy image, and (with a readout) Download CSV / Copy data — operate on the
 * live plot `<svg>` and readout, merged with any caller {@link ContextMenuConfig}.
 * Fullscreen opens a large dialog holding a still snapshot of the chart, scaled
 * to fill; the live chart and its data table remain the accessible source.
 *
 * @remarks Image export rasterises the plot's marks and axes (not the HTML
 * header or legend) at `2×`, inlining the SVG's computed paint so the bitmap
 * carries its colours. "Copy image" appears only where the Clipboard image API
 * is available. `contextMenu={false}` renders the chart untouched, leaving the
 * browser's native menu.
 *
 * @internal
 */
export function ChartContextMenu({
	contextMenu,
	rootRef,
	readout,
	title,
	children,
}: ChartContextMenuProps) {
	// The fullscreen snapshot's markup, or `null` when the dialog is closed.
	const [snapshot, setSnapshot] = useState<string | null>(null)

	if (contextMenu === false) return <>{children}</>

	const plotSvg = (): SVGSVGElement | null => rootRef.current?.querySelector('svg') ?? null

	const exportImage = async (type: ChartImageType, extension: string): Promise<void> => {
		const svg = plotSvg()

		if (!svg) return

		try {
			const blob = await rasterizeChartSvg(svg, type)

			if (blob) downloadBlob(blob, chartFileName(title, extension))
		} catch {
			// A failed rasterise (image decode) has no retry affordance to drive.
		}
	}

	const copyChartImage = async (): Promise<void> => {
		const svg = plotSvg()

		if (!svg) return

		try {
			const blob = await rasterizeChartSvg(svg, 'image/png')

			if (blob) await copyImage(blob)
		} catch {
			// As with export: nothing to surface on a failed rasterise.
		}
	}

	const openFullscreen = (): void => {
		const root = rootRef.current

		if (root) setSnapshot(captureChartSnapshot(root))
	}

	const imageActions: ContextMenuItem[] = [
		{
			key: 'fullscreen',
			label: 'Fullscreen',
			icon: <Maximize2 />,
			onSelect: openFullscreen,
		},
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
		...(canCopyImage()
			? [
					{
						key: 'copy-image',
						label: 'Copy image',
						icon: <Copy />,
						onSelect: () => void copyChartImage(),
					} satisfies ContextMenuItem,
				]
			: []),
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
				open={snapshot !== null}
				onOpenChange={(open) => {
					if (!open) setSnapshot(null)
				}}
				size="full"
				aria-label={title ?? 'Chart'}
				className="flex h-[calc(100svh-2rem)] max-h-[calc(100svh-2rem)] flex-col"
			>
				<div data-slot="chart-fullscreen-bar" className="flex items-center justify-between gap-4">
					<DialogTitle className="min-w-0 truncate">{title ?? 'Chart'}</DialogTitle>

					<DialogClose>
						<Button variant="bare" aria-label="Close fullscreen">
							<X />
						</Button>
					</DialogClose>
				</div>

				{snapshot !== null && (
					<div
						// The enlarged chart is a purely visual still — the live chart behind
						// the overlay and its data table stay the accessible source, so hide
						// the duplicate from assistive tech.
						aria-hidden="true"
						data-slot="chart-fullscreen"
						className="mt-4 min-h-0 flex-1 overflow-auto [&>*]:h-full"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: an id-namespaced same-document snapshot of the chart's own markup, not external input
						dangerouslySetInnerHTML={{ __html: snapshot }}
					/>
				)}
			</Dialog>
		</>
	)
}
