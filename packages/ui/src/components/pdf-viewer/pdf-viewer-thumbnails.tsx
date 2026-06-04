'use client'

import { X } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRoving, useScrollWithin } from '../../hooks'
import { k } from '../../recipes/kata/pdf-viewer'
import { Button } from '../button'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Sheet, SheetBody, SheetTitle } from '../sheet'
import { usePdfViewerContext } from './context'

// Stable keys for the skeleton tiles shown before the first thumbnail resolves;
// the length is the placeholder count.
const PLACEHOLDER_KEYS = Array.from({ length: 6 }, (_, i) => `placeholder-${i}`)

export function PdfViewerThumbnails() {
	const { pages, safePage, goToPage, loading, isDesktop, thumbsOpen, setThumbsOpen, rootRef } =
		usePdfViewerContext()

	const scrollCurrentIntoView = useScrollWithin()

	const sidebarRef = useRef<HTMLElement>(null)

	const handleSidebarKeyDown = useRoving(sidebarRef, {
		itemSelector: '[data-slot="pdf-viewer-thumbnail"]',
		orientation: 'vertical',
	})

	const thumbnailList = useMemo(
		() =>
			pages.map((p, index) => {
				const pageNumber = index + 1

				return {
					key: p.id ?? index,
					pageNumber,
					label: p.label ?? `Page ${pageNumber}`,
					thumbnail: p.thumbnail ?? p.src,
				}
			}),
		[pages],
	)

	const renderList = (onSelect?: () => void, layout: 'list' | 'grid' = 'list') => (
		<ul
			data-slot="pdf-viewer-thumbnails"
			className={cn(layout === 'grid' ? k.thumbnails.grid : k.thumbnails.base)}
		>
			{loading && thumbnailList.length === 0
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

			{thumbnailList.map((item) => {
				const isCurrent = item.pageNumber === safePage

				return (
					<li key={item.key}>
						<button
							ref={isCurrent ? scrollCurrentIntoView : undefined}
							type="button"
							data-slot="pdf-viewer-thumbnail"
							data-current={isCurrent || undefined}
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

	if (pages.length === 0 && !loading) return null

	return (
		<>
			{isDesktop && (
				<aside
					ref={sidebarRef}
					data-slot="pdf-viewer-sidebar"
					className={cn(k.sidebar.base)}
					onKeyDown={handleSidebarKeyDown}
				>
					<div className={cn(k.sidebar.header)}>Pages</div>
					{renderList()}
				</aside>
			)}

			{!isDesktop && (
				<Sheet
					side="left"
					open={thumbsOpen}
					onOpenChange={setThumbsOpen}
					container={rootRef.current}
				>
					<SheetTitle>
						<Flex gap="sm" justify="between" align="center">
							<div>Pages</div>
							<Button
								variant="plain"
								aria-label="Close thumbnails"
								onClick={() => setThumbsOpen(false)}
							>
								<Icon icon={<X />} />
							</Button>
						</Flex>
					</SheetTitle>
					<SheetBody>{renderList(() => setThumbsOpen(false), 'grid')}</SheetBody>
				</Sheet>
			)}
		</>
	)
}
