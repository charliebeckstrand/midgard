'use client'

import { useEffect, useState } from 'react'

function findScrollParent(el: HTMLElement): HTMLElement {
	let node: HTMLElement | null = el.parentElement

	while (node) {
		const { overflowY } = getComputedStyle(node)

		if (overflowY === 'auto' || overflowY === 'scroll') return node

		node = node.parentElement
	}

	return document.documentElement
}

export function useActiveSlug(slugs: string[]) {
	const [activeSlug, setActiveSlug] = useState<string | null>(null)

	useEffect(() => {
		if (slugs.length === 0) return

		const firstSection = document.getElementById(slugs[0])

		if (!firstSection) return

		const scrollContainer = findScrollParent(firstSection)

		const OFFSET = 24

		const handler = () => {
			const sections = slugs
				.map((slug) => document.getElementById(slug))
				.filter((el): el is HTMLElement => el !== null)

			const isAtBottom =
				scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 2

			if (isAtBottom) {
				setActiveSlug(sections[sections.length - 1]?.id ?? null)
				return
			}

			const containerTop =
				scrollContainer === document.documentElement
					? 0
					: scrollContainer.getBoundingClientRect().top

			const active = [...sections]
				.reverse()
				.find((el) => el.getBoundingClientRect().top - containerTop <= OFFSET)

			setActiveSlug(active?.id ?? sections[0]?.id ?? null)
		}

		handler()

		scrollContainer.addEventListener('scroll', handler, { passive: true })

		if (window.location.hash) {
			const target = document.getElementById(window.location.hash.slice(1))

			target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}

		return () => scrollContainer.removeEventListener('scroll', handler)
	}, [slugs])

	return { activeSlug }
}
