'use client'

import { ButtonIconTooltip } from '../../components/button/button-icon-tooltip'
import { announce } from '../../core/announcer'
import { cn } from '../../core/cn'
import { Maximize2 } from '../../primitives/icons/glyphs/glyph-maximize2'
import { ZoomIn } from '../../primitives/icons/glyphs/glyph-zoom-in'
import { ZoomOut } from '../../primitives/icons/glyphs/glyph-zoom-out'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/map'
import { MAP_ZOOM_FIT } from './engine/map-constants'
import { zoomKeyFactor } from './engine/map-zoom/gesture'
import { MAP_FIT_TRANSFORM, sameTransform } from './engine/map-zoom/transform'
import type { MapZoomControlsPlacement } from './engine/types'
import { describeZoom, mapMessages } from './map-messages'
import type { MapZoom } from './use-map-zoom'

/**
 * The zoom-in, zoom-out, and reset buttons of a zooming map: the single-pointer
 * path to each scale that a pinch, the wheel, or the zoom keys reach (WCAG 2.2
 * SC 2.5.1 and SC 2.5.7). Each button steps the view through the same calls as
 * the keys, and speaks the same line.
 *
 * @remarks The group sits beside the `role="img"` plot, not in it. The image
 * role makes each descendant presentational, so a button in the plot has no
 * name and no role.
 *
 * @internal
 */
export function MapZoomControls({
	zoom,
	placement,
}: {
	zoom: MapZoom
	/** The side of the plot the group sits on: a row above or below, a stack beside. */
	placement: MapZoomControlsPlacement
}) {
	const intl = useIntl()

	const { transform, max, cursor } = zoom

	const step = (action: 'in' | 'out') => {
		announce(describeZoom(intl, cursor.stepZoom(zoomKeyFactor(action))))
	}

	const fit = () => {
		cursor.fit()

		announce(intl.formatMessage(mapMessages.zoomReset))
	}

	// The tooltips face away from the plot, across the axis of the group. A
	// flip then puts a tooltip on the plot, never on the next button.
	return (
		// biome-ignore lint/a11y/useSemanticElements: a fieldset is a form part, and the group holds no field.
		<div
			role="group"
			data-slot="map-zoom-controls"
			aria-label={intl.formatMessage(mapMessages.zoomControls)}
			className={cn(
				k.zoomControls.base,
				horizontal(placement) ? k.zoomControls.row : k.zoomControls.stack,
			)}
		>
			<ButtonIconTooltip
				label={intl.formatMessage(mapMessages.zoomIn)}
				tooltipPlacement={placement}
				icon={<ZoomIn />}
				disabled={transform.k >= max}
				onClick={() => step('in')}
			/>
			<ButtonIconTooltip
				label={intl.formatMessage(mapMessages.zoomOut)}
				tooltipPlacement={placement}
				icon={<ZoomOut />}
				disabled={transform.k <= MAP_ZOOM_FIT}
				onClick={() => step('out')}
			/>
			<ButtonIconTooltip
				label={intl.formatMessage(mapMessages.zoomFit)}
				tooltipPlacement={placement}
				icon={<Maximize2 />}
				disabled={sameTransform(transform, MAP_FIT_TRANSFORM)}
				onClick={fit}
			/>
		</div>
	)
}

/** Whether the group is a row: above or below the plot. @internal */
function horizontal(placement: MapZoomControlsPlacement): boolean {
	return placement === 'top' || placement === 'bottom'
}
