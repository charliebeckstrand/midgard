'use client'

import { type CSSProperties, type SyntheticEvent, useLayoutEffect, useRef } from 'react'
import type { PdfViewerSlot } from './types'

/** Props for {@link PdfViewerPageImage}. @internal */
type PdfViewerPageImageProps = {
	page: PdfViewerSlot
	/** The accessible name of the page. Empty for a copy that assistive technology must skip. */
	alt: string
	className?: string
	style?: CSSProperties
	onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void
}

/**
 * Shows the full raster of a page: an `<img>` for a blob URL or a caller's image, and a
 * `<canvas>` for a bitmap.
 *
 * @remarks The `src` path keeps its pages as bitmaps, so a render costs no encode. The canvas
 * takes the name of the page through `role="img"`, as the `<img>` takes it through `alt`.
 * @internal
 */
export function PdfViewerPageImage({
	page,
	alt,
	className,
	style,
	onLoad,
}: PdfViewerPageImageProps) {
	if (page.bitmap) {
		return <PdfViewerBitmap bitmap={page.bitmap} alt={alt} className={className} style={style} />
	}

	return (
		<img
			data-slot="pdf-viewer-page-image"
			src={page.src}
			alt={alt}
			className={className}
			style={style}
			onLoad={onLoad}
		/>
	)
}

/**
 * Draws a bitmap onto a canvas at its own size. The styles scale the canvas as they scale an
 * image.
 *
 * @remarks The draw is in a layout effect, so the page is on the canvas in the frame that
 * mounts it. The cleanup frees the backing store, and does not wait for the collector.
 * @internal
 */
function PdfViewerBitmap({
	bitmap,
	alt,
	className,
	style,
}: {
	bitmap: ImageBitmap
	alt: string
	className?: string
	style?: CSSProperties
}) {
	const ref = useRef<HTMLCanvasElement>(null)

	useLayoutEffect(() => {
		const canvas = ref.current

		if (!canvas) return

		canvas.width = bitmap.width
		canvas.height = bitmap.height

		canvas.getContext('2d')?.drawImage(bitmap, 0, 0)

		return () => {
			canvas.width = 0
			canvas.height = 0
		}
	}, [bitmap])

	return (
		<canvas
			ref={ref}
			data-slot="pdf-viewer-page-image"
			role={alt ? 'img' : undefined}
			aria-label={alt || undefined}
			aria-hidden={alt ? undefined : true}
			className={className}
			style={style}
		/>
	)
}
