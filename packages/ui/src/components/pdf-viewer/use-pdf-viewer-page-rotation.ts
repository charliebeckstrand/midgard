'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type PageRotationResult = {
	/** Raw rotation in degrees for the active page. May be ≥ 360. */
	rotation: number
	/** Rotation reduced to one of `0 | 90 | 180 | 270`. */
	normalizedRotation: number
	/** True at 90° / 270°, where the page's bbox width and height are swapped. False at 0° and 180°. */
	isTransposed: boolean
	/** Rotates the active page 90° clockwise. */
	rotate: () => void
}

/**
 * Manages per-page rotation state. Each page tracks its rotation independently,
 * so navigating away from a rotated page and back preserves it.
 */
export function usePdfViewerPageRotation(
	page: number,
	defaultRotation: number,
	documentKey?: unknown,
): PageRotationResult {
	const [rotations, setRotations] = useState<Record<number, number>>({})

	// Per-page rotations belong to one document; clear them when the document
	// changes so a new `src`/`pages` isn't rendered with the prior doc's rotations.
	const prevDocumentKeyRef = useRef(documentKey)

	useEffect(() => {
		if (prevDocumentKeyRef.current === documentKey) return

		prevDocumentKeyRef.current = documentKey

		setRotations({})
	}, [documentKey])

	const rotation = rotations[page] ?? defaultRotation

	const normalizedRotation = ((rotation % 360) + 360) % 360

	const isTransposed = normalizedRotation === 90 || normalizedRotation === 270

	const rotate = useCallback(() => {
		setRotations((prev) => ({ ...prev, [page]: (prev[page] ?? defaultRotation) + 90 }))
	}, [page, defaultRotation])

	return { rotation, normalizedRotation, isTransposed, rotate }
}
