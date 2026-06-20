'use client'

import type { Ref } from 'react'
import { cn, dataAttr } from '../../core'
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
	 * Rail orientation: vertical sidebar list or multi-column grid.
	 * @defaultValue 'list'
	 */
	layout?: 'list' | 'grid'
}

/**
 * The thumbnail rail shared by the sidebar and grid layouts. Renders skeleton
 * placeholders until the first thumbnail resolves, then one button per page;
 * the current page is marked `aria-current` and receives the scroll-into-view
 * ref so it stays visible as the document is paged.
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
	layout = 'list',
}: PdfViewerThumbnailListProps) {
	return (
		<ul
			data-slot="pdf-viewer-thumbnails"
			className={cn(layout === 'grid' ? k.thumbnails.grid : k.thumbnails.base)}
		>
			{loading && items.length === 0
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
					<li key={item.key}>
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
