'use client'

import { type SyntheticEvent, useState } from 'react'
import type { PdfViewerPage } from './types'

type Size = { width: number; height: number }

export type UsePageSizeResult = {
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
export function usePageSize(
	activePage: PdfViewerPage | undefined,
	safePage: number,
): UsePageSizeResult {
	const [naturalSize, setNaturalSize] = useState<Size | null>(null)

	// Resets `naturalSize` synchronously when the active page changes — the
	// React-docs "adjust state on prop change" pattern. Avoids the effect-as-
	// invalidation-trigger anti-pattern and keeps the dep array honest.
	const [prevPageId, setPrevPageId] = useState(activePage?.id)
	const [prevSafePage, setPrevSafePage] = useState(safePage)

	if (prevPageId !== activePage?.id || prevSafePage !== safePage) {
		setPrevPageId(activePage?.id)
		setPrevSafePage(safePage)
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
