'use client'

import { type ReactNode, type RefObject, Suspense, useLayoutEffect, useRef } from 'react'
import { cn } from '../../core'
import { useInView } from '../../hooks'
import { useHydrated } from '../../hooks/use-hydrated'
import { ContentHeightContext, type ContentHeightHost } from '../../primitives/content-height'
import { type Mount, MountHold, useMountHold } from '../../primitives/mount'
import { k } from '../../recipes/kata/dashboard'
import { DashboardTileContext, useDashboardStoreContext } from './context'
import { DashboardTileBoundary } from './dashboard-tile-boundary'

/** Props for {@link DashboardTileContent}. @internal */
export type DashboardTileContentProps = {
	/** The id of the tile, which the scope hooks read. */
	id: string
	/** The name of the tile, for the error text. */
	label: string
	/** The mount policy of the content. */
	mount: Mount
	/** Whether the content is inert, as in edit mode. */
	inert: boolean
	/** What the tile shows while the content suspends or is held back. */
	fallback: ReactNode
	/** Receives each error that the boundary catches. */
	onError: (error: unknown) => void
	/**
	 * The box that the widget can claim the height of its content from, or
	 * `null` where the box keeps its size, as in the expand dialog.
	 */
	host: ContentHeightHost | null
	/** Whether the box takes the height of its content, and reports it to the board. */
	natural: boolean
	/** The widget. */
	children?: ReactNode
}

/**
 * Reports the content height of the card around `ref` to the board while
 * `natural` holds. The height is the header row, the content, and the insets
 * of the card. The board then gives the tile the rows that hold it.
 */
function useNaturalHeight(id: string, ref: RefObject<HTMLDivElement | null>, natural: boolean) {
	const store = useDashboardStoreContext()

	useLayoutEffect(() => {
		const box = ref.current

		const card = box?.parentElement

		if (!natural || !box || !card) return

		const report = () => {
			const style = getComputedStyle(card)

			const top = box.getBoundingClientRect().top - card.getBoundingClientRect().top

			const end =
				Number.parseFloat(style.paddingBottom) + Number.parseFloat(style.borderBottomWidth)

			store.measure(id, Math.ceil(top + box.offsetHeight + end))
		}

		report()

		const observer = new ResizeObserver(report)

		observer.observe(box)

		return () => {
			observer.disconnect()

			store.measure(id, undefined)
		}
	}, [store, id, ref, natural])
}

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
	natural,
	children,
}: DashboardTileContentProps) {
	const ref = useRef<HTMLDivElement>(null)

	useNaturalHeight(id, ref, natural && mount === 'always')

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
			<div
				ref={ref}
				data-slot="dashboard-tile-content"
				inert={inert}
				className={cn(k.content({ natural }))}
			>
				{body}
			</div>
		)
	}

	return (
		<HeldDashboardTileContent
			id={id}
			mount={mount}
			inert={inert}
			natural={natural}
			fallback={fallback}
		>
			{body}
		</HeldDashboardTileContent>
	)
}

/** Props for {@link HeldDashboardTileContent}. @internal */
type HeldDashboardTileContentProps = {
	/** The id of the tile. */
	id: string
	/** The policy that holds the content: `lazy` or `active`. */
	mount: Exclude<Mount, 'always'>
	/** Whether the content is inert. */
	inert: boolean
	/** Whether the box takes the height of its content. */
	natural: boolean
	/** What the tile shows while the content is held back. */
	fallback: ReactNode
	/** The scoped, guarded content. */
	children: ReactNode
}

/**
 * The content box behind the viewport gate. `lazy` mounts the content when the
 * tile comes near the viewport, and keeps it. `active` also unmounts it when the
 * tile leaves. The cell holds the space, so nothing shifts when the content comes.
 *
 * @remarks
 * The server and the hydration render show the fallback. An observer cannot run
 * on the server, and the client must hydrate the same markup. The gate therefore
 * opens only after hydration.
 *
 * @internal
 */
function HeldDashboardTileContent({
	id,
	mount,
	inert,
	natural,
	fallback,
	children,
}: HeldDashboardTileContentProps) {
	// `active` must see the tile leave the viewport, so its observer stays connected.
	const { ref, inView } = useInView({ once: mount !== 'active' })

	useNaturalHeight(id, ref, natural)

	const hydrated = useHydrated()

	const hold = useMountHold(hydrated && inView, mount)

	return (
		<div
			ref={ref}
			data-slot="dashboard-tile-content"
			data-deferred={hold.present ? undefined : ''}
			inert={inert}
			className={cn(k.content({ natural }))}
		>
			{hold.present ? <MountHold hold={hold}>{children}</MountHold> : fallback}
		</div>
	)
}
