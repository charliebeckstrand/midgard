import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { ToolbarGroup } from '../toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import type { PdfViewerZoom } from './types'

type PdfViewerZoomControlsProps = {
	zoom: PdfViewerZoom
	disabled: boolean
}

export function PdfViewerZoomControls({ zoom, disabled }: PdfViewerZoomControlsProps) {
	const sortedLevels = useMemo(() => [...zoom.levels].sort((a, b) => a - b), [zoom.levels])

	const minZoom = sortedLevels[0] ?? 1
	const maxZoom = sortedLevels[sortedLevels.length - 1] ?? 1

	const nextLevelUp = sortedLevels.find((l) => l > zoom.value + 1e-6) ?? maxZoom
	const nextLevelDown = [...sortedLevels].reverse().find((l) => l < zoom.value - 1e-6) ?? minZoom

	const zoomIn = () => zoom.setValue(nextLevelUp)
	const zoomOut = () => zoom.setValue(nextLevelDown)
	const fit = () => zoom.setValue(1)

	return (
		<ToolbarGroup aria-label="Zoom">
			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="plain"
						aria-label="Zoom out"
						disabled={disabled || zoom.value <= minZoom}
						onClick={zoomOut}
					>
						<Icon icon={<ZoomOut />} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Zoom Out ({(nextLevelDown * 100).toFixed(0)}%)</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="plain"
						aria-label="Zoom in"
						disabled={disabled || zoom.value >= maxZoom}
						onClick={zoomIn}
					>
						<Icon icon={<ZoomIn />} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Zoom In ({(nextLevelUp * 100).toFixed(0)}%)</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="plain"
						aria-label="Fit to page"
						disabled={disabled || zoom.value === 1}
						onClick={fit}
					>
						<Icon icon={<Maximize2 />} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Fit to page</TooltipContent>
			</Tooltip>
		</ToolbarGroup>
	)
}
