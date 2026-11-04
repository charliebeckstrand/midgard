'use client'

import { Suspense, use } from 'react'
import { createLazyModule } from '../../utilities/lazy-module'
import type { GridDataProps } from './grid-data-types'
import { useGridCursor } from './use-grid-cursor'
import { useGridDataRender } from './use-grid-data-render'
import { useGridDataSetup } from './use-grid-data-setup'

/**
 * The editing layer of the grid: the editing cursor, the editors, the new-row
 * slot, and the row form. Only an editable grid loads it.
 *
 * @internal
 */
const editingKit = createLazyModule(() => import('./grid-data-editable'))

/**
 * Loads the editing layer. The test setup calls it, so that an editable grid
 * renders in the first pass, as on a page that already loaded the layer.
 *
 * @internal
 */
export const loadGridEditing = editingKit.load

/**
 * The data-grid implementation behind {@link Grid}, read-only and editable.
 * {@link Grid} renders it through a memoized wrapper.
 *
 * A grid with no `editable` renders {@link GridDataReadOnly}. An editable grid
 * renders the same phases with the editing cursor, from a chunk that only an
 * editable grid loads ({@link GridDataEditable}). The two are different
 * components, because the hooks of a component cannot change between renders.
 * Thus a grid whose `editable` goes from set to unset, or back, mounts again.
 *
 * @remarks Until the chunk is loaded, an editable grid suspends. On the server
 * and in hydration, the boundary waits for the chunk, so the markup of the
 * server stays. A grid that mounts on the client before the chunk is loaded
 * shows the read-only grid in its place, and then mounts again one time as an
 * editable grid. The chunk stays loaded for the page, so each later editable
 * grid renders in its first pass.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function GridData<T>(props: GridDataProps<T>) {
	if (props.editable === undefined) return <GridDataReadOnly<T> {...props} />

	return (
		<Suspense fallback={<GridDataReadOnly<T> {...props} editable={undefined} />}>
			<GridDataEditableLoader<T> {...props} />
		</Suspense>
	)
}

/**
 * A grid that cannot edit: the phases of the grid with the read-only cursor.
 *
 * @remarks The body runs in phases, and the data goes down only. Each path
 * back up has one named mechanism: the `GridIndexRefs` bundle, and the
 * `wrapperRef` that the setup makes. No context is between the phases, so the
 * flow stays visible in the three calls. A split by feature does not work,
 * because grouping gates the cursor, the engine, and the frame. Only the
 * cursor phase changes between a read-only grid and an editable grid.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
function GridDataReadOnly<T>(props: GridDataProps<T>) {
	const setup = useGridDataSetup<T>(props)

	const cursor = useGridCursor<T>(setup.cursorInput)

	return useGridDataRender<T>(props, setup, cursor)
}

/**
 * Renders the editable grid from the editing layer, and suspends until the
 * layer is loaded. A loaded layer renders in the first pass (see
 * {@link LazyModule.load}).
 *
 * @internal
 */
function GridDataEditableLoader<T>(props: GridDataProps<T>) {
	const kit = use(editingKit.load())

	return <kit.GridDataEditable<T> {...props} />
}
