'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import { Activity, type ReactNode } from 'react'
import { OVERVIEW } from '../../utilities/trail'

/**
 * The view of each page of an election, which the layout renders. The view of
 * the current page is visible. The other views stay mounted and hidden, so a
 * switch to them shows a view that is already rendered.
 */
export function ElectionViews({ views }: { views: Readonly<Record<string, ReactNode>> }) {
	const segment = useSelectedLayoutSegment()

	const current = segment ?? OVERVIEW

	return Object.entries(views).map(([key, view]) => (
		<Activity key={key} mode={key === current ? 'visible' : 'hidden'}>
			{view}
		</Activity>
	))
}
