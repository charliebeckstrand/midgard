'use client'

import { type Ref, type RefObject, useEffect, useRef } from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { rangeKeys } from '../../utilities'

/** One entry in the thumbnail rail. @internal */
type PdfViewerThumbnailItem = {
	key: string | number
	pageNumber: number
	label: string
	thumbnail: string
}

// Stable keys for the skeleton tiles shown before the first thumbnail resolves;
// the length is the placeholder count.
const PLACEHOLDER_KEYS = rangeKeys(6, 'placeholder')

/** The overflow values of a node that scrolls. */
const SCROLLABLE = /^(auto|scroll|overlay)$/

/**
 * The node that scrolls the tiles: the rail itself in the list layout, and the body of the
 * Sheet in the grid layout.
 *
 * @remarks The observer needs this node as its root. A margin grows the root only, and the
 * scroller clips each tile before the margin of the viewport can apply.
 * @internal
 */
function scrollRoot(element: HTMLElement): HTMLElement | null {
	for (let node: HTMLElement | null = element; node; node = node.parentElement) {
		if (SCROLLABLE.test(getComputedStyle(node).overflowY)) return node
	}

	return null
}

/** Props for {@link PdfViewerThumbnailList}. @internal */
type PdfViewerThumbnailListProps = {
	items: PdfViewerThumbnailItem[]
	loading: boolean
	safePage: number
	goToPage: (page: number) => void
	/** Ref attached to the current page's button so the rail keeps it in view. */
	scrollCurrentIntoView: Ref<HTMLButtonElement>
	/** Fired after a page is selected; the mobile Sheet uses it to close. */
	onSelect?: () => void
	/**
	 * Receives the 0-based indices of the tiles in or near view, whenever they change. The `src`
	 * path renders the thumbnails of those pages only.
	 */
	onVisibleChange?: ((indices: number[]) => void) | null
	/**
	 * Rail orientation: vertical sidebar list or multi-column grid.
	 * @defaultValue 'list'
	 */
	layout?: 'list' | 'grid'
}

/**
 * Reports the tiles of `list` that are in view, or within 200px of it, through one observer.
 *
 * @remarks One observer for the whole rail, not one for each tile. The root of the observer is
 * the scroll container of the rail, so a tile scrolled out of the rail is out of view, and the
 * 200px margin grows the rail.
 * Where nothing can observe (the server, and jsdom without a stub), every tile counts as in
 * view, as `useInView` does. The cleanup reports none, because a rail that unmounts or hides
 * shows nothing.
 * @internal
 */
function useVisibleTiles(
	list: RefObject<HTMLUListElement | null>,
	count: number,
	onVisibleChange: ((indices: number[]) => void) | null | undefined,
) {
	useEffect(() => {
		const element = list.current

		if (!element || !onVisibleChange || count === 0) return

		if (typeof IntersectionObserver === 'undefined') {
			onVisibleChange(Array.from({ length: count }, (_, index) => index))

			return () => onVisibleChange([])
		}

		const visible = new Set<number>()

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const index = Number((entry.target as HTMLElement).dataset.index)

					if (entry.isIntersecting) visible.add(index)
					else visible.delete(index)
				}

				onVisibleChange([...visible].sort((a, b) => a - b))
			},
			{ root: scrollRoot(element), rootMargin: '200px' },
		)

		for (const tile of element.querySelectorAll('[data-index]')) observer.observe(tile)

		return () => {
			observer.disconnect()

			onVisibleChange([])
		}
	}, [list, count, onVisibleChange])
}

/**
 * The thumbnail rail shared by the sidebar and grid layouts. Renders skeleton
 * placeholders until the first thumbnail resolves, then one button per page.
 * The current page is marked `aria-current` and receives the scroll-into-view
 * ref, so it stays visible as the document is paged.
 *
 * @internal
 */
export function PdfViewerThumbnailList({
	items,
	loading,
	safePage,
	goToPage,
	scrollCurrentIntoView,
	onSelect,
	onVisibleChange,
	layout = 'list',
}: PdfViewerThumbnailListProps) {
	const listRef = useRef<HTMLUListElement>(null)

	useVisibleTiles(listRef, items.length, onVisibleChange)

	// While the list holds only the loading placeholders, it hides from
	// assistive tech as a whole. Empty items would read as a list of blank
	// entries, and a hidden item would give a wrong item count.
	const placeholdersOnly = loading && items.length === 0

	return (
		<ul
			ref={listRef}
			data-slot="pdf-viewer-thumbnails"
			aria-hidden={ariaAttr(placeholdersOnly)}
			className={cn(layout === 'grid' ? k.thumbnails.grid : k.thumbnails.base)}
		>
			{placeholdersOnly
				? PLACEHOLDER_KEYS.map((key) => (
						<li key={key}>
							<span
								aria-hidden="true"
								data-slot="pdf-viewer-thumbnail-placeholder"
								className={cn(k.thumbnail.placeholder)}
							/>
						</li>
					))
				: null}

			{items.map((item) => {
				const isCurrent = item.pageNumber === safePage

				return (
					<li key={item.key} data-index={item.pageNumber - 1}>
						<button
							ref={isCurrent ? scrollCurrentIntoView : undefined}
							type="button"
							data-slot="pdf-viewer-thumbnail"
							data-current={dataAttr(isCurrent)}
							aria-label={`Go to ${item.label}`}
							aria-current={isCurrent ? 'page' : undefined}
							className={cn(k.thumbnail.base)}
							onClick={() => {
								goToPage(item.pageNumber)

								onSelect?.()
							}}
						>
							<span className={cn(k.thumbnail.frame)}>
								{item.thumbnail ? (
									<img
										src={item.thumbnail}
										alt=""
										loading="lazy"
										className={cn(k.thumbnail.image)}
									/>
								) : (
									<span className={cn(k.thumbnail.fallback)}>{item.pageNumber}</span>
								)}
							</span>
							<span className={cn(k.thumbnail.label)}>{item.pageNumber}</span>
						</button>
					</li>
				)
			})}
		</ul>
	)
}
