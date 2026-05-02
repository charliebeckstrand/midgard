'use client'

import { X } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRoving, useScrollWithin } from '../../hooks'
import { Button } from '../button'
import { Flex } from '../flex/component'
import { Icon } from '../icon'
import { Sheet, SheetBody, SheetTitle } from '../sheet'
import type { PdfViewerPage } from './component'
import { k } from './variants'

export type PdfViewerThumbnailsProps = {
	pages: PdfViewerPage[]
	safePage: number
	goToPage: (page: number) => void
	isLoading: boolean
	isDesktop: boolean
	thumbsOpen: boolean
	onThumbsOpenChange: (open: boolean) => void
	container: HTMLElement | null
}

export function PdfViewerThumbnails({
	pages,
	safePage,
	goToPage,
	isLoading,
	isDesktop,
	thumbsOpen,
	onThumbsOpenChange,
	container,
}: PdfViewerThumbnailsProps) {
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
			{isLoading && thumbnailList.length === 0
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

	if (pages.length === 0 && !isLoading) return null

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
					onOpenChange={onThumbsOpenChange}
					container={container}
				>
					<SheetTitle>
						<Flex gap="sm" justify="between" align="center">
							<div>Pages</div>
							<Button
								variant="plain"
								aria-label="Close thumbnails"
								prefix={<Icon icon={<X />} />}
								onClick={() => onThumbsOpenChange(false)}
							/>
						</Flex>
					</SheetTitle>
					<SheetBody>{renderList(() => onThumbsOpenChange(false), 'grid')}</SheetBody>
				</Sheet>
			)}
		</>
	)
}
