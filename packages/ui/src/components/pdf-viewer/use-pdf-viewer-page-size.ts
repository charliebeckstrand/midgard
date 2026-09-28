'use client'

import { type SyntheticEvent, useCallback, useMemo, useState } from 'react'
import type { PdfViewerPage } from './types'

type Size = { width: number; height: number }

/** Active-page sizing returned by {@link usePdfViewerPageSize}. @internal */
type PageSizeResult = {
	/** Intrinsic page size: caller-supplied dimensions, the measured natural size, or `null` pre-load. */
	pageSize: Size | null
	/** Wire to the active page `<img>`'s `onLoad`; captures the natural size. */
	onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
}

/**
 * Resolves the active page's intrinsic dimensions. Prefers caller-supplied
 * `width`/`height` from the page model, then falls back to the natural
 * dimensions of the loaded `<img>`. Page change resets the measured size;
 * a new page does not inherit the previous page's aspect ratio while its
 * `<img>` loads.
 *
 * @param documentKey - Identity of the current document. A change resets the measured
 * size, also when the page index and the page `id` stay the same.
 * @returns `{ pageSize, onImageLoad }` — the resolved size and the `<img>`
 * `onLoad` handler that measures the natural size.
 * @internal
 */
export function usePdfViewerPageSize(
	activePage: PdfViewerPage | undefined,
	safePage: number,
	documentKey?: unknown,
): PageSizeResult {
	const [naturalSize, setNaturalSize] = useState<Size | null>(null)

	const resetKey = `${activePage?.id ?? ''}:${safePage}`
	// Adjusted during render: a new page or document drops the measured size.
	const [measured, setMeasured] = useState({ resetKey, documentKey })

	if (measured.resetKey !== resetKey || measured.documentKey !== documentKey) {
		setMeasured({ resetKey, documentKey })
		setNaturalSize(null)
	}

	// Stable identity on the primitive dimensions: `pageSize` flows through the
	// page scale into the PdfViewerContext memo, so a fresh literal every render
	// would defeat it. Memoize only the caller size and fall back with `??`, so a
	// caller-dimensioned page keeps one identity even across the natural-size
	// measurement its `<img>` load triggers.
	const callerWidth = activePage?.width

	const callerHeight = activePage?.height

	const callerSize = useMemo<Size | null>(
		() => (callerWidth && callerHeight ? { width: callerWidth, height: callerHeight } : null),
		[callerWidth, callerHeight],
	)

	const pageSize = callerSize ?? naturalSize

	const onImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
		const img = event.currentTarget

		setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
	}, [])

	return { pageSize, onImageLoad }
}
