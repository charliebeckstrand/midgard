import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo } from 'react'
import { useIntl } from '../../primitives/intl/use-intl'
import { ToolbarGroup } from '../toolbar'
import { pdfViewerMessages } from './pdf-viewer-messages'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'
import type { PdfViewerZoom } from './types'

/** Props for {@link PdfViewerZoomControls}. @internal */
type PdfViewerZoomControlsProps = {
	zoom: PdfViewerZoom
	disabled: boolean
}

/**
 * Zoom out / in / reset buttons. In and out snap to the next discrete level
 * above or below the current scale. Reset returns to 1, which is the base fit,
 * whichever `fit` mode the viewer is in. Buttons disable at the ends of the
 * level range.
 *
 * @internal
 */
export function PdfViewerZoomControls({ zoom, disabled }: PdfViewerZoomControlsProps) {
	const sortedLevels = useMemo(() => zoom.levels.toSorted((a, b) => a - b), [zoom.levels])

	const minZoom = sortedLevels[0] ?? 1
	const maxZoom = sortedLevels.at(-1) ?? 1

	const nextLevelUp = sortedLevels.find((level) => level > zoom.value + 1e-6) ?? maxZoom
	const nextLevelDown = sortedLevels.findLast((level) => level < zoom.value - 1e-6) ?? minZoom

	const zoomIn = () => zoom.setValue(nextLevelUp)
	const zoomOut = () => zoom.setValue(nextLevelDown)
	const resetZoom = () => zoom.setValue(1)

	const intl = useIntl()

	const percent = (level: number) => intl.formatNumber(level, { style: 'percent' })

	return (
		<ToolbarGroup aria-label={intl.formatMessage(pdfViewerMessages.zoom)}>
			<PdfViewerToolbarButton
				label={intl.formatMessage(pdfViewerMessages.zoomOut)}
				tooltip={intl.formatMessage(pdfViewerMessages.zoomOutTo, {
					percent: percent(nextLevelDown),
				})}
				icon={<ZoomOut />}
				disabled={disabled || zoom.value <= minZoom}
				onClick={zoomOut}
			/>
			<PdfViewerToolbarButton
				label={intl.formatMessage(pdfViewerMessages.zoomIn)}
				tooltip={intl.formatMessage(pdfViewerMessages.zoomInTo, { percent: percent(nextLevelUp) })}
				icon={<ZoomIn />}
				disabled={disabled || zoom.value >= maxZoom}
				onClick={zoomIn}
			/>
			<PdfViewerToolbarButton
				label={intl.formatMessage(pdfViewerMessages.resetZoom)}
				icon={<Maximize2 />}
				disabled={disabled || zoom.value === 1}
				onClick={resetZoom}
			/>
		</ToolbarGroup>
	)
}
