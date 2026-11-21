/**
 * The columns and the row sets that the editing benches share
 * (`grid-editing.bench.tsx` and `grid-editing-session.bench.tsx`).
 */

import type { GridColumn } from '../modules/grid/types'
import { SHIPMENT_FIELDS, type Shipment, shipments } from './fixtures'

/**
 * The columns of an editable grid. The identity column stays read-only, and
 * every other column binds its field, so the editing augmentation has a target
 * to wire.
 */
export const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) =>
	id === 'id'
		? { id, title, cell: (row) => String(row.id), readOnly: true }
		: { id, title, field: id, cell: (row) => String(row[id]) },
)

/**
 * The row sets of the benches. They are built at collection time, so only the
 * render is in the timed region.
 */
export const SIZES = [100, 500, 1_000].map((count) => shipments(count))
