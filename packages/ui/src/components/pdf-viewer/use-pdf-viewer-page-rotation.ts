'use client'

import { useCallback, useRef, useState } from 'react'

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
 * navigating away from a rotated page and back preserves it. Every page starts
 * unrotated.
 *
 * @param documentKey - Identity of the current document; rotations reset when it
 * changes, so a new document starts unrotated.
 * @returns `{ rotation, isTransposed, rotate }` for the active page.
 * @internal
 */
export function usePdfViewerPageRotation(page: number, documentKey?: unknown): PageRotationResult {
	const [rotations, setRotations] = useState<Record<number, number>>({})

	// Per-page rotations belong to one document; clear them when the document
	// changes. Reset in render (not an effect) so a document swap's first paint
	// doesn't briefly reuse the previous document's rotation for the same page
	// index — matching the page-size reset.
	const prevDocumentKeyRef = useRef(documentKey)

	if (prevDocumentKeyRef.current !== documentKey) {
		prevDocumentKeyRef.current = documentKey

		setRotations({})
	}

	const rotation = rotations[page] ?? 0

	const normalizedRotation = ((rotation % 360) + 360) % 360

	const isTransposed = normalizedRotation === 90 || normalizedRotation === 270

	const rotate = useCallback(() => {
		setRotations((prev) => ({ ...prev, [page]: (prev[page] ?? 0) + 90 }))
	}, [page])

	return { rotation, isTransposed, rotate }
}
