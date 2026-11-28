'use client'

import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import type { ListItemRevealValue, ListRevealLine } from './context'

/** The content of each line of a row that truncates. A line that fits is absent. @internal */
export type CutLines = Partial<Record<ListRevealLine, ReactNode>>

/**
 * The state of the truncation reveal of one row: the lines that truncate, and
 * the context value that the lines report to.
 *
 * @returns `[reveal, lines]`. Give `reveal` to `ListItemRevealContext`, and
 * `reveal.armRef` to the trigger of the tooltip. `lines` holds the content of
 * each line that truncates.
 * @internal
 */
export function useListItemRevealState(): [ListItemRevealValue, CutLines] {
	const armRef = useRef<HTMLElement>(null)

	const [lines, setLines] = useState<CutLines>({})

	// A report of the same content returns the same object, so it renders nothing.
	const report = useCallback((line: ListRevealLine, content: ReactNode) => {
		setLines((prev) => {
			if ((prev[line] ?? null) === content) return prev

			const next = { ...prev }

			if (content === null) delete next[line]
			else next[line] = content

			return next
		})
	}, [])

	const reveal = useMemo(() => ({ armRef, report }), [report])

	return [reveal, lines]
}

/** Whether a row has a line that truncates, so its reveal has text to show. @internal */
export function hasCutLines(lines: CutLines): boolean {
	return lines.label !== undefined || lines.description !== undefined
}
