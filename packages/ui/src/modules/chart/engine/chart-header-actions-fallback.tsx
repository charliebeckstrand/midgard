'use client'

import { EllipsisVertical, Table2 } from 'lucide-react'
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { cn } from '../../../core/cn'
import { useIntl } from '../../../primitives/intl/use-intl'
import type { ChartContextMenuConfig } from './chart-context-menu'
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

/** The props of a chart that decide its buttons in the header row. @internal */
type ChartHeaderProps = {
	title?: string
	contextMenu?: ChartContextMenuConfig | false
}

/**
 * Props for {@link ChartHeaderActionsFallback}. The `<span>` that holds the
 * buttons takes the rest.
 */
export type ChartHeaderActionsFallbackProps = Omit<ComponentProps<'span'>, 'children'> & {
	/**
	 * The chart element that the box renders. Give the same element, so the
	 * buttons come from the props of the chart: its `title` and its
	 * `contextMenu`.
	 */
	chart: ReactElement<ChartHeaderProps>
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
 * draw. The box tells it instead: it gives this component the chart element
 * that it renders. This component reads the props of the chart with the rules
 * of the chart, and draws the same buttons with the same markup. They have the
 * same size and place. They do nothing, and they are `inert`. The slot shows
 * them until the chart puts its own buttons in it, in the same frame.
 *
 * A chart with no data has no View data button. This component cannot see the
 * data of each kind of chart, so it draws the button until the mount.
 *
 * @example
 * ```tsx
 * const chart = <SeatChart contextMenu={{ button: true }} … />
 *
 * <HeaderActions slotted>
 *   <header>
 *     {title}
 *     <HeaderActionsSlot>
 *       <ChartHeaderActionsFallback chart={chart} />
 *     </HeaderActionsSlot>
 *   </header>
 *
 *   {chart}
 * </HeaderActions>
 * ```
 */
export function ChartHeaderActionsFallback({
	chart,
	className,
	...props
}: ChartHeaderActionsFallbackProps) {
	const { title, contextMenu } = chart.props

	// The rules of the chart menu: `false` turns the menu off, the View data entry
	// is a default item, and `button` turns on the touch menu button.
	if (contextMenu === false) return null

	const viewData = contextMenu?.defaultItems !== false

	const menuButton = contextMenu?.button === true

	if (!viewData && !menuButton) return null

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
