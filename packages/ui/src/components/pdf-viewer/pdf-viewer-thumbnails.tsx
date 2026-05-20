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

export function PdfViewerThumbnails() {
	const { pages, safePage, goToPage, loading, isDesktop, thumbsOpen, setThumbsOpen, rootRef } =
		usePdfViewerContext()

	const scrollActiveIntoView = useScrollWithin()

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
			className={cn(layout === 'grid' ? k.thumbnailsGrid : k.thumbnails)}
		>
			{loading && thumbnailList.length === 0
				? ['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
						<li key={`placeholder-${key}`}>
							<span
								aria-hidden="true"
								data-slot="pdf-viewer-thumbnail-placeholder"
								className={cn(k.thumbnailPlaceholder)}
							/>
						</li>
					))
				: null}

			{thumbnailList.map((item) => {
				const isActive = item.pageNumber === safePage

				return (
					<li key={item.key}>
						<button
							ref={isActive ? scrollActiveIntoView : undefined}
							type="button"
							data-slot="pdf-viewer-thumbnail"
							data-active={isActive || undefined}
							aria-label={`Go to ${item.label}`}
							aria-current={isActive ? 'page' : undefined}
							className={cn(k.thumbnail)}
							onClick={() => {
								goToPage(item.pageNumber)
								onSelect?.()
							}}
						>
							<span className={cn(k.thumbnailFrame)}>
								{item.thumbnail ? (
									<img
										src={item.thumbnail}
										alt=""
										loading="lazy"
										className={cn(k.thumbnailImage)}
									/>
								) : (
									<span className={cn(k.thumbnailFallback)}>{item.pageNumber}</span>
								)}
							</span>
							<span className={cn(k.thumbnailLabel)}>{item.pageNumber}</span>
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
					className={cn(k.sidebar)}
					onKeyDown={handleSidebarKeyDown}
				>
					<div className={cn(k.sidebarHeader)}>Pages</div>
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
