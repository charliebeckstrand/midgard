'use client'

import { useComposedRefs } from 'motion/react'
import {
	type ComponentProps,
	type KeyboardEvent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core/cn'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { useA11yRoving } from '../../hooks/a11y/use-a11y-roving'
import { ChevronLeft, Ellipsis } from '../../primitives/icons/icons'
import { useIntl } from '../../primitives/intl/use-intl'
import { k, type ToolbarVariants } from '../../recipes/kata/toolbar'
import type { AccessibleName } from '../../types/accessible-name'
import { ButtonIconTooltip } from '../button/button-icon-tooltip'
import { TooltipGroup } from '../tooltip'
import { ToolbarContext, type ToolbarContextValue } from './context'
import { TOOLBAR_ITEM_SELECTOR } from './toolbar-constants'
import { toolbarMessages } from './toolbar-messages'
import { markOverflow, markPaged, nextPage, PAGED_ATTRIBUTE } from './toolbar-overflow'
import { markRowEdges } from './toolbar-row-edges'

/**
 * Props for {@link Toolbar}. Requires `aria-label` or `aria-labelledby`.
 * `overflow="more"` takes a plain horizontal toolbar only.
 */
export type ToolbarProps = AccessibleName &
	Omit<ComponentProps<'div'>, 'aria-label' | 'aria-labelledby'> &
	(
		| (ToolbarVariants & {
				/**
				 * What the toolbar does with the items that its row cannot hold. With
				 * `wrap`, they wrap onto more rows. With `more`, the toolbar is one row,
				 * and they wait behind a More button at the end of the row.
				 * @defaultValue 'wrap'
				 */
				overflow?: 'wrap'
		  })
		| {
				orientation?: 'horizontal'
				variant?: 'plain'
				overflow: 'more'
		  }
	)

/** Where the focus goes after a page change of a toolbar with More. @internal */
type PageFocus = 'page' | 'more' | null

/**
 * A toolbar that groups related controls. It has roving-tabindex arrow-key
 * navigation along its `orientation`. Requires `aria-label`/`aria-labelledby`;
 * the group is never an unnamed `toolbar`. A consumer `ref` reaches the toolbar
 * element.
 *
 * The toolbar is one Tab stop. A group in the toolbar that has its own arrow
 * keys, such as a `Segment`, keeps its own Tab stop and its own keys. An arrow
 * key from a control before the group moves the focus into it.
 *
 * @remarks
 * A horizontal toolbar wraps onto more rows when it is narrow. A
 * `<ToolbarSeparator>` that then ends or starts a row separates nothing, so
 * the toolbar hides it, and each row starts at the edge of the toolbar. One
 * `ResizeObserver` on the toolbar measures the rows again when the toolbar
 * changes size. A vertical toolbar, or a horizontal toolbar on one row, shows
 * each separator.
 *
 * Along its axis, the hit area of each button fills half of the gap on each
 * side, in the toolbar and in a `<ToolbarGroup>`. The buttons keep their
 * space, and the pointer meets no dead space between two buttons. The hit
 * areas do not cross a `<ToolbarSeparator>`, and they do not grow on the cross
 * axis.
 *
 * The toolbar is a `<TooltipGroup>`. The first tooltip of its controls opens
 * after its delay. While a tooltip is open, and for 300 ms after it closes,
 * the tooltip of another control opens at once, with no animation.
 *
 * With `overflow="more"`, the toolbar is always one row. The items stay in
 * their order. An item that the row cannot hold leaves the row, and each item
 * after it leaves too, so the order of the items is their priority. A More
 * button then shows at the end of the row. A press on More shows the next
 * page: Back, and the items that left the row. If they do not fit, the page
 * has its own More. Back shows the first page again, and so does Escape. CSS
 * fits the row, so the server paints the fit and the toolbar keeps the height
 * of one row on each page. Give the items one height, as icon buttons have.
 *
 * @remarks With `overflow="more"`, the toolbar sets `inert` on each item that is
 * not on the row, so the arrow keys and the Tab key skip it, and a screen
 * reader does not read it. More and Back are in the arrow order. When the
 * focus is in the toolbar, a press on More moves it to the first item of the
 * next page, and Back moves it to More. A press that keeps the focus out of
 * the toolbar, such as in the toolbar of a Wysiwyg, moves no focus. Back and
 * More are named in the language of the reader.
 */
export function Toolbar({
	orientation = 'horizontal',
	variant,
	overflow = 'wrap',
	className,
	children,
	ref: consumerRef,
	onKeyDown,
	...labelProps
}: ToolbarProps) {
	const ref = useRef<HTMLDivElement>(null)

	const intl = useIntl()

	const more = overflow === 'more' && orientation === 'horizontal'

	// The number of items of the caller before the current page.
	const [paged, setPaged] = useState(0)

	const pageFocus = useRef<PageFocus>(null)

	// Roving and the row marks read `ref`, so a consumer `ref` joins it.
	const setRoot = useComposedRefs(ref, consumerRef)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: TOOLBAR_ITEM_SELECTOR,
		orientation,
		// Single Tab stop: Tab enters and leaves the group; arrows move between controls.
		manageTabIndex: true,
	})

	// The rows change only when the toolbar changes size or axis. The layout
	// effect marks the rows before the first paint, and the observer runs after it.
	useLayoutEffect(() => {
		markRowEdges(ref.current, orientation)
	}, [orientation])

	// A toolbar with More marks its page, its row edges, and its row after each
	// render, before the paint, because a new page or new items change the row
	// while the size of the toolbar stays. Then the focus goes where the page
	// change sends it.
	useLayoutEffect(() => {
		if (!more) return

		const toolbar = ref.current

		markPaged(toolbar, paged)

		markRowEdges(toolbar, orientation)

		markOverflow(toolbar)

		const focus = pageFocus.current

		pageFocus.current = null

		if (focus === 'more') moreButton(toolbar)?.focus()
		else if (focus === 'page') pageItem(toolbar)?.focus()
	})

	useEffect(() => {
		const toolbar = ref.current

		if (!toolbar) return

		let frame = 0

		// A start mark can change the rows, and so the size of the toolbar in the
		// callback of its own observer. The browser then holds that notification
		// for the next frame, and fires "ResizeObserver loop completed with
		// undelivered notifications" on `window`. Thus a change of the start marks
		// stops the observation for the rest of the delivery, and observes again
		// in the next frame. The new observation reports the size that it finds,
		// so no resize is lost, and it marks the same rows, so it stops there.
		const observer = new ResizeObserver(() => {
			const changed = markRowEdges(toolbar, orientation)

			if (more) markOverflow(toolbar)

			if (!changed) return

			observer.disconnect()

			frame = requestAnimationFrame(() => observer.observe(toolbar))
		})

		observer.observe(toolbar)

		return () => {
			cancelAnimationFrame(frame)

			observer.disconnect()
		}
	}, [orientation, more])

	const context = useMemo<ToolbarContextValue>(() => ({ orientation }), [orientation])

	/** Shows the page that starts at `next`, and keeps the focus in the toolbar if it is there. */
	function page(next: number, focus: Exclude<PageFocus, null>) {
		const toolbar = ref.current

		if (toolbar?.contains(toolbar.ownerDocument.activeElement)) pageFocus.current = focus

		setPaged(next)
	}

	function showMore() {
		const toolbar = ref.current

		if (!toolbar) return

		const next = nextPage(toolbar)

		if (next !== -1) page(next, 'page')
	}

	function handleEscape(event: KeyboardEvent<HTMLDivElement>) {
		if (!more || paged === 0 || event.key !== 'Escape') return

		event.preventDefault()

		event.stopPropagation()

		page(0, 'more')
	}

	const styles = k({ orientation, variant, overflow: more ? 'more' : 'wrap' })

	return (
		<ToolbarContext value={context}>
			<div
				{...labelProps}
				ref={setRoot}
				data-slot="toolbar"
				role="toolbar"
				aria-orientation={orientation}
				// Roving takes no gate: the consumer's handler runs first, then roving.
				onKeyDown={composeEventHandlers(
					onKeyDown,
					(event: KeyboardEvent<HTMLDivElement>) => {
						handleEscape(event)

						handleKeyDown(event)
					},
					{ checkForDefaultPrevented: false },
				)}
				className={cn(styles.base, className)}
			>
				<TooltipGroup>
					{more && paged > 0 && (
						<ButtonIconTooltip
							data-slot="toolbar-back"
							variant="bare"
							label={intl.formatMessage(toolbarMessages.back)}
							icon={<ChevronLeft className="rtl:-scale-x-100" />}
							disabled={false}
							onClick={() => page(0, 'more')}
						/>
					)}
					{children}
					{more && (
						// The anchor is inert until the row marks show that an item left
						// the row, so the server markup and a toolbar that fits have no
						// More in the arrow order or the tree.
						<span data-slot="toolbar-more" inert className={styles.more}>
							<ButtonIconTooltip
								variant="bare"
								label={intl.formatMessage(toolbarMessages.more)}
								icon={<Ellipsis />}
								disabled={false}
								onClick={showMore}
							/>
						</span>
					)}
				</TooltipGroup>
			</div>
		</ToolbarContext>
	)
}

/** The More button of a toolbar with More. @internal */
function moreButton(toolbar: HTMLElement | null): HTMLElement | null {
	return toolbar?.querySelector<HTMLElement>(':scope > [data-slot="toolbar-more"] > button') ?? null
}

/**
 * The first item of the current page of a toolbar with More: the first control
 * after Back that is not paged out and not below the row.
 * @internal
 */
function pageItem(toolbar: HTMLElement | null): HTMLElement | null {
	if (!toolbar) return null

	for (const item of toolbar.querySelectorAll<HTMLElement>(TOOLBAR_ITEM_SELECTOR)) {
		if (item.closest('[data-slot="toolbar-back"], [data-slot="toolbar-more"], [inert]')) continue

		if (item.closest(`[${PAGED_ATTRIBUTE}]`)) continue

		return item
	}

	return null
}
