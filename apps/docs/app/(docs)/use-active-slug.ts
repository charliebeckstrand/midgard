'use client'

import { useEffect, useRef, useState } from 'react'

import type { DocEntry } from './types'

export function useActiveSlug(guides: DocEntry[], reference: DocEntry[]) {
	const [activeSlug, setActiveSlug] = useState<string | null>(null)

	const slugsRef = useRef<string[]>([])

	useEffect(() => {
		slugsRef.current = [...guides, ...reference].map((d) => d.slug)
	}, [guides, reference])

	useEffect(() => {
		const OFFSET = 64

		const handler = () => {
			const sections = slugsRef.current
				.map((slug) => document.getElementById(slug))
				.filter((el): el is HTMLElement => el !== null)

			const isAtBottom =
				window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2

			if (isAtBottom) {
				setActiveSlug(sections[sections.length - 1]?.id ?? null)

				return
			}

			const active = [...sections].reverse().find((el) => el.getBoundingClientRect().top <= OFFSET)

			setActiveSlug(active?.id ?? sections[0]?.id ?? null)
		}

		handler()

		window.addEventListener('scroll', handler, { passive: true })

		return () => window.removeEventListener('scroll', handler)
	}, [])

	return { activeSlug }
}
