'use client'

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { ActiveIndicator, ActiveIndicatorScope } from '../../primitives'
import { Link } from '../../primitives/link'
import { slots as k } from '../../recipes/kata/toc'
import { tocItemVariants, tocLinkVariants, tocListVariants, tocVariants } from './variants'

const DEFAULT_LEVELS = [2, 3] as const

export type TocItem = {
	id: string
	label: string
	level: number
}

export type TocProps = Omit<React.ComponentPropsWithoutRef<'nav'>, 'aria-label'> & {
	container?: RefObject<HTMLElement | null>
	levels?: readonly number[]
	items?: readonly TocItem[]
	activeId?: string
	onActiveChange?: (id: string) => void
	offsetTop?: number
	label?: string
}

function scanHeadings(container: HTMLElement, levels: readonly number[]): TocItem[] {
	const selector = levels.map((l) => `h${l}[id]`).join(',')

	const nodes = container.querySelectorAll<HTMLElement>(selector)

	return Array.from(nodes, (node) => ({
		id: node.id,
		label: node.textContent?.trim() ?? '',
		level: Number(node.tagName.slice(1)),
	}))
}

export function Toc({
	container,
	levels = DEFAULT_LEVELS,
	items,
	activeId: activeIdProp,
	onActiveChange,
	offsetTop = 80,
	label = 'Table of contents',
	className,
	...props
}: TocProps) {
	const [scanned, setScanned] = useState<readonly TocItem[]>([])

	const onActiveChangeRef = useRef(onActiveChange)

	onActiveChangeRef.current = onActiveChange

	const onControllableChange = useCallback((next: string | undefined) => {
		const fn = onActiveChangeRef.current

		if (fn && next !== undefined) fn(next)
	}, [])

	const [activeId, setActiveId] = useControllable<string>({
		value: activeIdProp,
		onChange: onControllableChange,
	})

	const activeIdRef = useRef(activeId)

	activeIdRef.current = activeId

	const headings = items ?? scanned

	useEffect(() => {
		if (items) return

		const root = container?.current ?? (typeof document !== 'undefined' ? document.body : null)

		if (!root) return

		setScanned(scanHeadings(root, levels))
	}, [container, levels, items])

	useEffect(() => {
		if (activeIdProp !== undefined || headings.length === 0 || typeof window === 'undefined') {
			return
		}

		const scrollTarget: HTMLElement | Window = container?.current ?? window

		let frame: number | null = null

		const update = () => {
			frame = null

			const containerTop =
				scrollTarget === window ? 0 : (scrollTarget as HTMLElement).getBoundingClientRect().top

			let current: string | undefined

			for (const h of headings) {
				const el = document.getElementById(h.id)

				if (!el) continue

				if (el.getBoundingClientRect().top - containerTop - offsetTop <= 0) {
					current = h.id
				} else {
					break
				}
			}

			current ??= headings[0]?.id

			if (current !== undefined && activeIdRef.current !== current) setActiveId(current)
		}

		const onScroll = () => {
			if (frame !== null) return

			frame = requestAnimationFrame(update)
		}

		update()

		scrollTarget.addEventListener('scroll', onScroll, { passive: true })

		window.addEventListener('resize', onScroll)

		return () => {
			if (frame !== null) cancelAnimationFrame(frame)

			scrollTarget.removeEventListener('scroll', onScroll)

			window.removeEventListener('resize', onScroll)
		}
	}, [container, headings, offsetTop, activeIdProp, setActiveId])

	const minLevel = useMemo(
		() => headings.reduce((m, h) => Math.min(m, h.level), Number.POSITIVE_INFINITY),
		[headings],
	)

	if (headings.length === 0) return null

	return (
		<nav aria-label={label} data-slot="toc" className={cn(tocVariants(), className)} {...props}>
			<ActiveIndicatorScope>
				<ol data-slot="toc-list" className={tocListVariants()}>
					{headings.map((h) => {
						const depth = Math.max(0, h.level - minLevel)

						const current = activeId === h.id

						return (
							<li key={h.id} data-slot="toc-item" className={tocItemVariants()}>
								{current && (
									<ActiveIndicator
										className={cn('w-px', k.activeIndicator)}
										style={{ borderRadius: 0 }}
									/>
								)}
								<Link
									href={`#${h.id}`}
									data-slot="toc-link"
									data-current={current ? '' : undefined}
									aria-current={current ? 'location' : undefined}
									className={tocLinkVariants({ current })}
									style={{ paddingInlineStart: `calc(${depth} * 0.75rem + 0.75rem)` }}
								>
									{h.label}
								</Link>
							</li>
						)
					})}
				</ol>
			</ActiveIndicatorScope>
		</nav>
	)
}
