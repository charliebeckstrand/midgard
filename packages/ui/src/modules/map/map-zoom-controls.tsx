'use client'

import type { ReactElement } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { announce } from '../../core/announcer'
import { ariaAttr } from '../../core/aria-attr'
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import { Maximize2, ZoomIn, ZoomOut } from '../../primitives/icons/icons'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/map'
import { MAP_ZOOM_FIT } from './engine/map-constants'
import { zoomKeyFactor } from './engine/map-zoom/gesture'
import { MAP_FIT_TRANSFORM, sameTransform } from './engine/map-zoom/transform'
import { describeZoom, mapMessages } from './map-messages'
import type { MapZoom } from './use-map-zoom'

/** Props for {@link MapZoomControl}. @internal */
type MapZoomControlProps = {
	label: string
	icon: ReactElement
	/** At the end of its range. The control keeps the focus and drops each press. */
	disabled: boolean
	onPress: () => void
}

/**
 * One icon button of {@link MapZoomControls}, with its label as a tooltip.
 *
 * @remarks Not the native `disabled`. A press can take its own control to the
 * end of the range, such as a zoom-in step onto the ceiling. A native
 * `disabled` then drops the focus to the page (WCAG 2.4.3).
 *
 * @internal
 */
function MapZoomControl({ label, icon, disabled, onPress }: MapZoomControlProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					// A view control writes no field, so a locked scope, such as a
					// submitting form, leaves it live.
					lockable={false}
					type="button"
					variant="plain"
					aria-label={label}
					aria-disabled={ariaAttr(disabled)}
					data-disabled={dataAttr(disabled)}
					onClick={disabled ? undefined : onPress}
				>
					<Icon icon={icon} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

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
export function MapZoomControls({ zoom }: { zoom: MapZoom }) {
	const intl = useIntl()

	const { transform, max, cursor } = zoom

	const step = (action: 'in' | 'out') => {
		announce(describeZoom(intl, cursor.stepZoom(zoomKeyFactor(action))))
	}

	const fit = () => {
		cursor.fit()

		announce(intl.formatMessage(mapMessages.zoomReset))
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: a fieldset is a form part, and the group holds no field.
		<div
			role="group"
			data-slot="map-zoom-controls"
			aria-label={intl.formatMessage(mapMessages.zoomControls)}
			className={cn(k.zoomControls)}
		>
			<MapZoomControl
				label={intl.formatMessage(mapMessages.zoomIn)}
				icon={<ZoomIn />}
				disabled={transform.k >= max}
				onPress={() => step('in')}
			/>
			<MapZoomControl
				label={intl.formatMessage(mapMessages.zoomOut)}
				icon={<ZoomOut />}
				disabled={transform.k <= MAP_ZOOM_FIT}
				onPress={() => step('out')}
			/>
			<MapZoomControl
				label={intl.formatMessage(mapMessages.zoomFit)}
				icon={<Maximize2 />}
				disabled={sameTransform(transform, MAP_FIT_TRANSFORM)}
				onPress={fit}
			/>
		</div>
	)
}
