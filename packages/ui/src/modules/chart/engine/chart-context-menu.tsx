'use client'

import { Clipboard, Download, Image as ImageIcon, Maximize2 } from 'lucide-react'
import {
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Button } from '../../../components/button'
import {
	ContextMenu,
	type ContextMenuConfig,
	type ContextMenuItem,
} from '../../../components/context-menu'
import { Dialog, DialogClose, DialogFooter } from '../../../components/dialog'
import {
	type ChartImageType,
	chartFileName,
	copyText,
	downloadBlob,
	downloadText,
	rasterizeChartImage,
	readoutToCsv,
} from './chart-export'
import { ChartFullscreenContext, useChartFullscreen } from './context'
import type { ChartReadoutSource } from './types'

/**
 * The mark the pointer was over when the right-click landed, so a menu item can act on that mark rather
 * than the chart as a whole. `index` is the datum's index within the chart's categories — the same index
 * {@link ChartCartesianProps.onCategoryClick} reports — or `null` when the click landed off any mark
 * (plot padding, the legend, the header).
 *
 * An index rather than a label on purpose: labels are formatted for display (the sector charts run period
 * keys through a formatter), so a consumer that needs the underlying value must look it up in its own data
 * by position.
 */
export type ChartContextMenuTarget = { index: number | null }

/**
 * A chart's right-click menu configuration: the shared {@link ContextMenuConfig}
 * (custom `items`, `defaultItems`, `position`) plus the chart's own export
 * options.
 */
export type ChartContextMenuConfig = Omit<ContextMenuConfig, 'items'> & {
	/**
	 * Custom entries to add to the menu, rendered in array order.
	 *
	 * Pass a function to build them from the mark under the pointer — the hook for a per-mark action
	 * ("View the shipments behind this bar"), whose label can name the mark it will act on. It is called
	 * with `index: null` when the right-click missed every mark, so an item that needs one can be omitted.
	 */
	items?: ContextMenuItem[] | ((target: ChartContextMenuTarget) => ContextMenuItem[])
	/**
	 * Include the legend in the downloaded PNG / JPG. Off exports the plot and
	 * header alone, the chart reflowing to fill the space the legend leaves.
	 * @defaultValue true
	 */
	downloadLegend?: boolean
	/**
	 * Fires when the fullscreen dialog opens or closes, whatever drove it: the Fullscreen
	 * item, the Close button, `Escape`, or an outside press.
	 *
	 * Observation only. The menu owns the dialog and there is no `open` option to pair
	 * with. Use it to suspend work behind the enlarged chart, or to mirror the view
	 * elsewhere. Never fires without a `fullscreen` element to open.
	 */
	onFullscreenChange?: (fullscreen: boolean) => void
}

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
	/**
	 * The values behind the marks as a cached thunk, backing the CSV actions;
	 * `null` drops them. Materialized only when an action is selected.
	 */
	readout: ChartReadoutSource | null
	/** The chart title, naming the fullscreen dialog and seeding export filenames. */
	title?: string
	/**
	 * A fresh, re-mountable copy of the chart, rendered large in the fullscreen
	 * dialog so hover and keyboard keep working — the chart re-measures at the
	 * dialog size rather than scaling a still. Absent, the Fullscreen item drops.
	 */
	fullscreen?: ReactElement
	/**
	 * Index of the mark under the pointer, or `null` off any mark. Reaches a
	 * function-form `items` as the {@link ChartContextMenuTarget} it builds. The
	 * host owns the hover state and passes it down, because this wrapper sits
	 * outside `ChartHoverContext` — it wraps the provider — and cannot read it.
	 * @internal
	 */
	targetIndex?: number | null
	/** The chart, wrapped as the right-click surface. */
	children: ReactNode
}

/** Fills the auto-height dialog's width at the chart's ratio, capped so it never runs taller than the viewport. @internal */
const FULLSCREEN_CHART_CLASS = 'w-full max-h-[calc(100dvh-9rem)]'

/**
 * Materializes the readout thunk on selection; a thunk that resolves to no readout
 * exports the empty CSV its chart would have rendered as a table.
 *
 * @internal
 */
function exportCsv(readout: ChartReadoutSource): string {
	const data = readout()

	return data === null ? '' : readoutToCsv(data)
}

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
 * leaving the browser's native menu. Inside the fullscreen dialog it renders
 * the chart untouched for a structural reason instead: there it is its own
 * re-mounted copy, so it refuses to wrap itself and no chart nests a second
 * menu.
 *
 * @internal
 */
export function ChartContextMenu({
	contextMenu,
	rootRef,
	readout,
	title,
	fullscreen,
	targetIndex,
	children,
}: ChartContextMenuProps) {
	const [open, setOpen] = useState(false)

	// The re-mounted chart exposes a `tabIndex=0` plot region as the dialog's
	// first tabbable child, and its keyboard handler `preventDefault`s Escape to
	// drop focus rather than close — which would swallow the dialog's own Escape
	// dismissal. Seat initial focus on Close instead, so the dialog opens with a
	// neutral tab stop focused and Escape shuts it.
	const closeRef = useRef<HTMLButtonElement>(null)

	const isFullscreen = useChartFullscreen()

	const config = contextMenu === false ? undefined : contextMenu

	const items = config?.items

	// This component re-renders on every pointer move across the plot (the host's
	// hover state). Without the memo a function-form `items` — and the icon
	// elements it builds — would be rebuilt ~60×/s while the pointer sweeps, all
	// of it discarded. The target object is minted here, so the memo keys on the
	// index the host actually holds.
	const customItems = useMemo(
		() => (typeof items === 'function' ? items({ index: targetIndex ?? null }) : items),
		[items, targetIndex],
	)

	const includeLegend = config?.downloadLegend ?? true

	const onFullscreenChange = config?.onFullscreenChange

	// The actions below only test whether a fullscreen copy exists; keying them on the
	// element's identity would bust them on any re-render that mints a fresh one.
	const hasFullscreen = Boolean(fullscreen)

	// The dialog's only writer: the Fullscreen item is reachable only while it is shut,
	// and the dialog's own dismissal — which the Close button routes through — only while
	// it is open, so every call is a real transition and the caller's callback rides along
	// unguarded.
	const handleFullscreenChange = useCallback(
		(next: boolean) => {
			setOpen(next)

			onFullscreenChange?.(next)
		},
		[onFullscreenChange],
	)

	const exportImage = useCallback(
		async (type: ChartImageType, extension: string): Promise<void> => {
			const root = rootRef.current

			if (!root) return

			try {
				const blob = await rasterizeChartImage(root, { type, includeLegend })

				if (blob) downloadBlob(blob, chartFileName(title, extension))
			} catch {
				// A failed rasterise (image decode) has no retry affordance to drive.
			}
		},
		[rootRef, includeLegend, title],
	)

	// Memoized for the same reason `customItems` is: this array and its five icon
	// elements were rebuilt on every pointer move and thrown away. Holding it steady
	// also spares `ContextMenu` the re-resolve its own `entries` memo keys on this
	// array, though that pass is the cheap half — it reorders existing references.
	const defaults = useMemo<ContextMenuItem[]>(
		() => [
			...(hasFullscreen
				? [
						{
							key: 'fullscreen',
							label: 'Fullscreen',
							icon: <Maximize2 />,
							onAction: () => handleFullscreenChange(true),
						},
					]
				: []),
			{
				key: 'download-png',
				label: 'Download PNG',
				icon: <ImageIcon />,
				onAction: () => void exportImage('image/png', 'png'),
			},
			{
				key: 'download-jpg',
				label: 'Download JPG',
				icon: <ImageIcon />,
				onAction: () => void exportImage('image/jpeg', 'jpg'),
			},
			...(readout
				? [
						{
							key: 'download-csv',
							label: 'Download CSV',
							icon: <Download />,
							onAction: () =>
								downloadText(exportCsv(readout), chartFileName(title, 'csv'), 'text/csv'),
						},
						{
							key: 'copy-data',
							label: 'Copy data',
							icon: <Clipboard />,
							onAction: () => copyText(exportCsv(readout)),
						},
					]
				: []),
		],
		[hasFullscreen, readout, title, handleFullscreenChange, exportImage],
	)

	// Held as an element, not gated on `open`. This component re-renders per pointer
	// move across the plot, and a closed Dialog still re-runs the heaviest hook chain
	// here on each one — its own controllable, min-width, and arrival hooks plus
	// Overlay's floating, dismiss, and scroll-lock. Every input below is stable across
	// a sweep, so the memo drops the whole subtree out of those renders; gating on
	// `open` instead would discard the exit animation Overlay exists to run.
	const dialog = useMemo(
		() =>
			fullscreen ? (
				<Dialog
					open={open}
					onOpenChange={handleFullscreenChange}
					initialFocus={closeRef}
					aria-label={title ?? 'Chart'}
					// Auto-height: the panel hugs the chart, which fills the panel width at
					// its 16/9 ratio. Capping the width by the viewport height keeps that
					// ratio from ever running taller than the screen, so on desktop the
					// panel centers and on mobile the sheet sizes to the chart's own height.
					className="sm:max-w-[calc((100dvh-9rem)*16/9)]"
				>
					<div data-slot="chart-fullscreen">
						{open && isValidElement(fullscreen) && (
							<ChartFullscreenContext value={true}>
								{cloneElement(fullscreen as ReactElement<Record<string, unknown>>, {
									width: undefined,
									height: undefined,
									// The dialog is auto-height and sized for the default 16/9 ratio,
									// so a consumer's fill mode (`aspectRatio={false}`) — which fills
									// its parent's height — has nothing to fill and collapses the plot
									// to nothing. Drop fill back to the default ratio for the
									// fullscreen view; an explicit ratio is left as the consumer set it.
									...((fullscreen.props as { aspectRatio?: unknown }).aspectRatio === false
										? { aspectRatio: undefined }
										: {}),
									className: FULLSCREEN_CHART_CLASS,
								})}
							</ChartFullscreenContext>
						)}
					</div>

					<DialogFooter>
						{/* Dismisses through the panel's own `close()`, the Dialog's `onOpenChange`,
						    so the button shares the route Escape and an outside press take. */}
						<DialogClose>
							<Button type="button" ref={closeRef}>
								Close
							</Button>
						</DialogClose>
					</DialogFooter>
				</Dialog>
			) : null,
		[fullscreen, open, handleFullscreenChange, title],
	)

	if (contextMenu === false) return <>{children}</>

	// A chart rendered inside the fullscreen dialog is this menu's own re-mounted
	// copy. It renders bare, so the enlarged chart never nests a second menu or
	// recurses. The rule lives here because this component provides
	// `ChartFullscreenContext` — a caller cannot forget to apply it.
	if (isFullscreen) return <>{children}</>

	return (
		<>
			<ContextMenu
				defaults={defaults}
				items={customItems}
				defaultItems={config?.defaultItems}
				position={config?.position}
				capped={config?.capped}
			>
				{children}
			</ContextMenu>

			{dialog}
		</>
	)
}
