'use client'

import { FloatingPortal } from '@floating-ui/react'
import { cn } from '../../core'
import { usePortalContainer } from '../../primitives/portal'
import { k } from '../../recipes/kata/pdf-viewer'
import { usePdfViewerContext } from './context'
import { usePdfViewerMagnifierContext } from './pdf-viewer-magnifier-context'
import { lensOffset } from './use-pdf-viewer-magnifier'

/**
 * The hover loupe: a circular lens beside the cursor showing the page under it, magnified.
 *
 * @remarks It magnifies by rendering the page a second time rather than by re-rasterizing at
 * a higher scale. The lens holds a copy of the page frame — the same image, at the same size,
 * wearing the same transform — inside a wrapper scaled about the pointer. So rotation, zoom
 * and the centring all compose exactly as they do on the page itself, with no second copy of
 * that arithmetic to keep in agreement, and no work at all beyond a paint: the browser has
 * the bitmap decoded already.
 *
 * Portalled — the viewport it sits over is a scroll container and would clip it — into the
 * same container every other floating surface in the package resolves, so a consumer that
 * scopes portals with `<UIProvider portalContainer>` does not find the lens somewhere else.
 * `pointer-events: none` throughout, so the lens can never take the press meant for a
 * highlighted region beneath it.
 *
 * @internal
 */
export function PdfViewerMagnifier() {
	const { magnifierSettings, activePage, scale, visible } = usePdfViewerContext()

	const magnifier = usePdfViewerMagnifierContext()

	const root = usePortalContainer()

	const { imageWidth, imageHeight, frameWidth, frameHeight, transform } = scale

	if (!magnifierSettings || !magnifier.open || !magnifier.point || !activePage || !visible) {
		return null
	}

	if (!frameWidth || !frameHeight) return null

	const { zoom, size } = magnifierSettings

	const offset = lensOffset(magnifier.point, zoom, size)

	return (
		<FloatingPortal root={root ?? undefined}>
			<div
				ref={magnifier.setFloating}
				{...magnifier.floatingProps}
				data-slot="pdf-viewer-magnifier"
				aria-hidden
				className={cn(k.viewport.page.magnifier.lens)}
				style={{ ...magnifier.floatingStyles, width: size, height: size }}
			>
				<div
					className={cn(k.viewport.page.magnifier.stage)}
					style={{
						width: frameWidth,
						height: frameHeight,
						transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
					}}
				>
					<img
						src={activePage.src}
						alt=""
						className={cn(k.viewport.page.base)}
						style={{ width: imageWidth, height: imageHeight, transform }}
					/>
				</div>
			</div>
		</FloatingPortal>
	)
}
