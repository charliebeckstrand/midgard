'use client'

import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual'
import {
	type ReactNode,
	type Ref,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from 'react'
import { cn } from '../../core/cn'
import { katachi } from '../../recipes'
import { useChatScrollContext } from './context'

const k = katachi.virtualList

// ── Types ──────────────────────────────────────────────

export type VirtualListHandle = {
	scrollToIndex: (
		index: number,
		opts?: { align?: 'start' | 'center' | 'end'; behavior?: 'auto' | 'smooth' },
	) => void
	scrollToEnd: (opts?: { behavior?: 'auto' | 'smooth' }) => void
	scrollToStart: (opts?: { behavior?: 'auto' | 'smooth' }) => void
	virtualizer: Virtualizer<HTMLDivElement, Element>
}

export type VirtualListProps<T> = {
	/** The full list of items. Only visible items (plus overscan) are rendered. */
	items: T[]
	/** Render function called for each visible item. */
	children: (item: T, index: number) => ReactNode
	/** Estimated height in pixels for items that haven't been measured yet. */
	estimateSize: number | ((index: number) => number)
	/** Number of items to render beyond the visible area. @default 5 */
	overscan?: number
	/** Gap between items in pixels. @default 0 */
	gap?: number
	/** Stable key extractor for items. Helps TanStack track items across reorders and prepends. */
	getItemKey?: (index: number) => string | number
	/** Imperative handle ref for scrollToIndex, scrollToEnd, etc. */
	ref?: Ref<VirtualListHandle>
	className?: string
	/** Called on every scroll event with current scroll state. */
	onScroll?: (info: { offset: number; size: number; totalSize: number }) => void
}

// ── Component ──────────────────────────────────────────

export function VirtualList<T>({
	items,
	children,
	estimateSize,
	overscan = 5,
	gap = 0,
	getItemKey,
	ref,
	className,
	onScroll,
}: VirtualListProps<T>) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const chatContext = useChatScrollContext()

	const estimateSizeFn = typeof estimateSize === 'function' ? estimateSize : () => estimateSize

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: estimateSizeFn,
		overscan,
		gap,
		getItemKey,
	})

	// Register with ChatScroll context if present.
	useEffect(() => {
		const el = scrollRef.current
		if (!el || !chatContext) return

		chatContext.register(el, virtualizer)
	}, [chatContext, virtualizer])

	// Scroll to end on mount when ChatScroll requests it.
	const hasScrolledRef = useRef(false)

	useEffect(() => {
		if (hasScrolledRef.current) return
		if (!chatContext || chatContext.initialAnchor !== 'end') return
		if (items.length === 0) return

		hasScrolledRef.current = true
		virtualizer.scrollToIndex(items.length - 1, { align: 'end' })
	}, [chatContext, items.length, virtualizer])

	// Forward scroll events.
	const handleScroll = useCallback(() => {
		if (!onScroll) return
		const el = scrollRef.current
		if (!el) return

		onScroll({
			offset: el.scrollTop,
			size: el.clientHeight,
			totalSize: el.scrollHeight,
		})
	}, [onScroll])

	// Imperative handle.
	useImperativeHandle(
		ref,
		() => ({
			scrollToIndex: (index, opts) => virtualizer.scrollToIndex(index, opts),
			scrollToEnd: (opts) => virtualizer.scrollToIndex(items.length - 1, { align: 'end', ...opts }),
			scrollToStart: (opts) => virtualizer.scrollToIndex(0, { align: 'start', ...opts }),
			virtualizer,
		}),
		[virtualizer, items.length],
	)

	const virtualItems = virtualizer.getVirtualItems()

	return (
		<div
			ref={scrollRef}
			data-slot="virtual-list"
			onScroll={handleScroll}
			className={cn(k.root, className)}
		>
			<div
				data-slot="virtual-list-viewport"
				className={k.viewport}
				style={{ height: virtualizer.getTotalSize() }}
			>
				{virtualItems.map((virtualItem) => (
					<div
						key={virtualItem.key}
						ref={virtualizer.measureElement}
						data-slot="virtual-list-item"
						data-index={virtualItem.index}
						className={k.item}
						style={{ transform: `translateY(${virtualItem.start}px)` }}
					>
						{children(items[virtualItem.index] as T, virtualItem.index)}
					</div>
				))}
			</div>
		</div>
	)
}
