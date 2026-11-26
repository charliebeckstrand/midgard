'use client'

import { type ReactNode, Suspense, useRef } from 'react'
import { dataAttr } from '../../core/data-attr'
import {
	ContentHeightContext,
	type ContentHeightHost,
} from '../../primitives/content-height/context'
import type { Mount } from '../../primitives/mount'
import { MountHold } from '../../primitives/mount'
import { useViewportHold } from '../../primitives/mount/use-mount-viewport-hold'
import { k } from '../../recipes/kata/dashboard'
import { DashboardTileContext } from './context'
import { DashboardTileBoundary, type DashboardTileBoundaryProps } from './dashboard-tile-boundary'

/** Props for {@link DashboardTileContent}. @internal */
export type DashboardTileContentProps = {
	/** The id of the tile, which the scope hooks read. */
	id: string
	/** The mount policy of the content. */
	mount: Mount
	/** Whether the content is inert, as in edit mode. */
	inert: boolean
	/** What the tile shows while the content suspends or is held back. */
	fallback: ReactNode
	/**
	 * The box that the widget can claim the height of its content from, or
	 * `null` where the box keeps its size, as in the expand dialog.
	 */
	host: ContentHeightHost | null
	/** The widget. */
	children?: ReactNode
} & Pick<DashboardTileBoundaryProps, 'label' | 'onError'>

/**
 * The content box of a tile: the scope of the tile, its error boundary, and its
 * Suspense boundary, behind the mount policy. Under `always`, the content renders
 * at once, and no observer runs.
 *
 * @internal
 */
export function DashboardTileContent({
	id,
	label,
	mount,
	inert,
	fallback,
	onError,
	host,
	children,
}: DashboardTileContentProps) {
	const body = (
		<DashboardTileContext value={id}>
			<ContentHeightContext value={host}>
				<DashboardTileBoundary label={label} onError={onError}>
					<Suspense fallback={fallback}>{children}</Suspense>
				</DashboardTileBoundary>
			</ContentHeightContext>
		</DashboardTileContext>
	)

	if (mount === 'always') {
		return (
			<div data-slot="dashboard-tile-content" inert={inert} className={k().content}>
				{body}
			</div>
		)
	}

	return (
		<HeldDashboardTileContent mount={mount} inert={inert} fallback={fallback}>
			{body}
		</HeldDashboardTileContent>
	)
}

/** Props for {@link HeldDashboardTileContent}. @internal */
type HeldDashboardTileContentProps = {
	/** The policy that holds the content: `lazy` or `active`. */
	mount: Exclude<Mount, 'always'>
	/** Whether the content is inert. */
	inert: boolean
	/** What the tile shows while the content is held back. */
	fallback: ReactNode
	/** The scoped, guarded content. */
	children: ReactNode
}

/**
 * The content box behind the viewport gate (`useViewportHold`). The cell holds
 * the space, so nothing shifts when the content comes.
 *
 * @internal
 */
function HeldDashboardTileContent({
	mount,
	inert,
	fallback,
	children,
}: HeldDashboardTileContentProps) {
	const ref = useRef<HTMLDivElement>(null)

	const { hold } = useViewportHold(ref, mount)

	return (
		<div
			ref={ref}
			data-slot="dashboard-tile-content"
			data-deferred={dataAttr(!hold.present)}
			inert={inert}
			className={k().content}
		>
			{hold.present ? <MountHold hold={hold}>{children}</MountHold> : fallback}
		</div>
	)
}
