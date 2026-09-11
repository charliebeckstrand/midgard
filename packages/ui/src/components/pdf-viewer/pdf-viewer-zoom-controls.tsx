import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo } from 'react'
import { ToolbarGroup } from '../toolbar'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'
import type { PdfViewerZoom } from './types'

/** Props for {@link PdfViewerZoomControls}. @internal */
type PdfViewerZoomControlsProps = {
	zoom: PdfViewerZoom
	disabled: boolean
}

/**
 * Zoom out / in / reset buttons. In and out snap to the next discrete level
 * above or below the current scale; reset returns to 1 — which is the base fit,
 * whichever `fit` mode the viewer is in. Buttons disable at
 * the ends of the level range.
 *
 * @internal
 */
export function PdfViewerZoomControls({ zoom, disabled }: PdfViewerZoomControlsProps) {
	const sortedLevels = useMemo(() => zoom.levels.toSorted((a, b) => a - b), [zoom.levels])

	const minZoom = sortedLevels[0] ?? 1
	const maxZoom = sortedLevels.at(-1) ?? 1

	const nextLevelUp = sortedLevels.find((l) => l > zoom.value + 1e-6) ?? maxZoom
	const nextLevelDown = sortedLevels.findLast((l) => l < zoom.value - 1e-6) ?? minZoom

	const zoomIn = () => zoom.setValue(nextLevelUp)
	const zoomOut = () => zoom.setValue(nextLevelDown)
	const resetZoom = () => zoom.setValue(1)

	return (
		<ToolbarGroup aria-label="Zoom">
			<PdfViewerToolbarButton
				label="Zoom out"
				tooltip={`Zoom Out (${(nextLevelDown * 100).toFixed(0)}%)`}
				icon={<ZoomOut />}
				disabled={disabled || zoom.value <= minZoom}
				onClick={zoomOut}
			/>
			<PdfViewerToolbarButton
				label="Zoom in"
				tooltip={`Zoom In (${(nextLevelUp * 100).toFixed(0)}%)`}
				icon={<ZoomIn />}
				disabled={disabled || zoom.value >= maxZoom}
				onClick={zoomIn}
			/>
			<PdfViewerToolbarButton
				label="Reset zoom"
				icon={<Maximize2 />}
				disabled={disabled || zoom.value === 1}
				onClick={resetZoom}
			/>
		</ToolbarGroup>
	)
}
