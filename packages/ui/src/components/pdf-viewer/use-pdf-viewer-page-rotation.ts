'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Active-page rotation state returned by {@link usePdfViewerPageRotation}. @internal */
type PageRotationResult = {
	/** Raw rotation in degrees for the active page. May be ≥ 360. */
	rotation: number
	/** True at 90° / 270°, where the page's bbox width and height are swapped. False at 0° and 180°. */
	isTransposed: boolean
	/** Rotates the active page 90° clockwise. */
	rotate: () => void
}

/**
 * Manages per-page rotation state. Each page tracks its rotation independently;
 * navigating away from a rotated page and back preserves it.
 *
 * @param defaultRotation - Starting rotation; rounded to the nearest 90°.
 * @param documentKey - Identity of the current document; rotations reset when it
 * changes, so a new document starts unrotated.
 * @returns `{ rotation, isTransposed, rotate }` for the active page.
 * @internal
 */
export function usePdfViewerPageRotation(
	page: number,
	defaultRotation: number,
	documentKey?: unknown,
): PageRotationResult {
	const [rotations, setRotations] = useState<Record<number, number>>({})

	// Per-page rotations belong to one document; clear them when the document
	// changes.
	const prevDocumentKeyRef = useRef(documentKey)

	useEffect(() => {
		if (prevDocumentKeyRef.current === documentKey) return

		prevDocumentKeyRef.current = documentKey

		setRotations({})
	}, [documentKey])

	// Documented to snap to 90° increments; an unsnapped default (e.g. 45)
	// puts `normalizedRotation` outside 0|90|180|270 and skews the
	// transposition math.
	const snappedDefault = Math.round(defaultRotation / 90) * 90

	const rotation = rotations[page] ?? snappedDefault

	const normalizedRotation = ((rotation % 360) + 360) % 360

	const isTransposed = normalizedRotation === 90 || normalizedRotation === 270

	const rotate = useCallback(() => {
		setRotations((prev) => ({ ...prev, [page]: (prev[page] ?? snappedDefault) + 90 }))
	}, [page, snappedDefault])

	return { rotation, isTransposed, rotate }
}
