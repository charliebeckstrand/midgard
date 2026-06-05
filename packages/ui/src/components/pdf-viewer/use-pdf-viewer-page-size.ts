'use client'

import { type SyntheticEvent, useRef, useState } from 'react'
import type { PdfViewerPage } from './types'

type Size = { width: number; height: number }

type PageSizeResult = {
	/** Intrinsic page size: caller-supplied dimensions, the measured natural size, or `null` pre-load. */
	pageSize: Size | null
	/** Wire to the active page `<img>`'s `onLoad` so the hook can capture the natural size. */
	onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
}

/**
 * Resolves the active page's intrinsic dimensions. Prefers caller-supplied
 * `width`/`height` from the page model, then falls back to the natural
 * dimensions of the loaded `<img>`. The measured size is reset on page
 * change so a new page whose intrinsic dimensions are unknown until `<img>`
 * loads doesn't inherit the previous page's aspect ratio.
 */
export function usePdfViewerPageSize(
	activePage: PdfViewerPage | undefined,
	safePage: number,
): PageSizeResult {
	const [naturalSize, setNaturalSize] = useState<Size | null>(null)

	const resetKey = `${activePage?.id ?? ''}:${safePage}`
	const prevResetKey = useRef(resetKey)

	if (prevResetKey.current !== resetKey) {
		prevResetKey.current = resetKey
		setNaturalSize(null)
	}

	const pageSize =
		activePage?.width && activePage.height
			? { width: activePage.width, height: activePage.height }
			: naturalSize

	const onImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
		const img = event.currentTarget

		setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
	}

	return { pageSize, onImageLoad }
}
