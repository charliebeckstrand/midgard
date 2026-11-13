'use client'

import { EllipsisVertical, Table2 } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { cn } from '../../../core/cn'
import { useIntl } from '../../../primitives/intl/use-intl'
import { chartMenuName, chartMessages } from './chart-messages'

/** Props for {@link ChartViewDataButton}. @internal */
type ChartViewDataButtonProps = {
	/** The chart title, which names the button. */
	title?: string
	disabled?: boolean
	onClick?: () => void
}

/**
 * The View data button of a chart in the header row of a box. The chart and
 * {@link ChartHeaderActionsFallback} draw it with this one markup, so the two
 * have the same size.
 *
 * @internal
 */
export function ChartViewDataButton({ title, ...props }: ChartViewDataButtonProps) {
	const intl = useIntl()

	return (
		<Button
			{...props}
			type="button"
			variant="bare"
			data-slot="chart-view-data"
			aria-label={
				title
					? intl.formatMessage(chartMessages.viewDataFor, { title })
					: intl.formatMessage(chartMessages.viewData)
			}
		>
			<Icon icon={<Table2 />} />
		</Button>
	)
}

/** Props for {@link ChartMenuButtonBox}. @internal */
type ChartMenuButtonBoxProps = {
	/** Where the box sits. See `ChartMenuButton`. */
	place: 'host' | 'header' | 'corner'
	/** The button, or the menu around it. */
	children: ReactNode
}

/**
 * The box of the touch menu button of a chart. It shows only where the primary
 * pointer is coarse.
 *
 * @internal
 */
export function ChartMenuButtonBox({ place, children }: ChartMenuButtonBoxProps) {
	return (
		<div
			data-slot="chart-menu-button"
			// In the chart header the box keeps the height of one header line, and the
			// button overflows it. The tier reserve of the header then stays correct.
			className={cn(
				'hidden shrink-0 items-center pointer-coarse:flex',
				place === 'header' && 'h-6',
				place === 'corner' && 'absolute end-0 top-0 z-10',
			)}
		>
			{children}
		</div>
	)
}

/** Props for {@link ChartMenuTriggerButton}. @internal */
type ChartMenuTriggerButtonProps = Omit<
	ComponentProps<'button'>,
	'type' | 'aria-label' | 'children' | 'color'
> & {
	/** The chart title, which names the button. */
	title?: string
}

/**
 * The button that opens the chart menu on a touch screen.
 *
 * @internal
 */
export function ChartMenuTriggerButton({ title, ...props }: ChartMenuTriggerButtonProps) {
	const intl = useIntl()

	return (
		<Button {...props} type="button" variant="bare" aria-label={chartMenuName(intl, title)}>
			<Icon icon={<EllipsisVertical />} />
		</Button>
	)
}

/**
 * Props for {@link ChartHeaderActionsFallback}. The `<span>` that holds the
 * buttons takes the rest.
 */
export type ChartHeaderActionsFallbackProps = Omit<ComponentProps<'span'>, 'children'> & {
	/** The title of the chart. Give the same value as the chart. */
	title?: string
	/**
	 * Draw the View data button. Give `false` when the menu of the chart has no
	 * View data entry.
	 *
	 * @defaultValue true
	 */
	viewData?: boolean
	/**
	 * Draw the touch menu button. Give `true` when the chart sets
	 * `contextMenu.button`.
	 *
	 * @defaultValue false
	 */
	menuButton?: boolean
}

/**
 * The buttons that a chart puts in the header row of a box, drawn before the
 * mount. Put it in the {@link HeaderActionsSlot} of the box.
 *
 * @remarks
 * The chart puts its buttons in the header row with a portal, and the portal
 * needs the element of the slot, which comes only after the mount. The server
 * render thus has no buttons, and they come in at hydration. The header row
 * renders before the chart, so the chart cannot tell the server render what to
 * draw. The box tells it instead: this component draws the same buttons with
 * the same markup, so they have the same size and place. They do nothing, and
 * they are `inert`. The slot shows them until the chart puts its own buttons
 * in it, in the same frame.
 *
 * Give the props that match the chart. A prop that does not match draws a
 * wrong button until the mount.
 *
 * @example
 * ```tsx
 * <HeaderActions slotted>
 *   <header>
 *     {title}
 *     <HeaderActionsSlot>
 *       <ChartHeaderActionsFallback menuButton />
 *     </HeaderActionsSlot>
 *   </header>
 *
 *   <SeatChart contextMenu={{ button: true }} … />
 * </HeaderActions>
 * ```
 */
export function ChartHeaderActionsFallback({
	title,
	viewData = true,
	menuButton = false,
	className,
	...props
}: ChartHeaderActionsFallbackProps) {
	return (
		<span {...props} inert className={cn('contents', className)}>
			{viewData && <ChartViewDataButton title={title} />}

			{menuButton && (
				<ChartMenuButtonBox place="host">
					<ChartMenuTriggerButton title={title} />
				</ChartMenuButtonBox>
			)}
		</span>
	)
}
