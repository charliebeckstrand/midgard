'use client'

import { useState } from 'react'
import { useControllable } from '../../hooks'
import {
	type CrossRowEntry,
	readControlledCell,
	type SettledCell,
} from './engine/grid-edit-transition'
import { type GridActiveEdit, sameCell } from './engine/grid-editing-utilities'
import type { GridEditSource } from './grid-data-types'
import type { GridEditableConfig } from './grid-editing-types'

/**
 * Resolves the session's cell against the set. It owns the `cell`
 * controllable, the value the transition effect settled, and the mask of an
 * uncontrolled coord that stranded. @internal
 */
export function useActiveCell<T>({
	config,
	cellScoped,
	controlled,
	initialCell,
	editableRows,
	editSource,
	entry,
}: {
	config: GridEditableConfig | undefined
	cellScoped: boolean
	controlled: boolean
	initialCell: GridActiveEdit | null
	editableRows: Set<string | number>
	editSource: GridEditSource<T>
	entry: CrossRowEntry | null
}) {
	// The session's cell as the binding holds it, before the grid resolves it
	// against the set. Uncontrolled, the grid writes it at event time. Controlled,
	// the consumer writes it, and the grid only asks through the change report.
	const [value, setValue] = useControllable<GridActiveEdit>({
		value: cellScoped ? config?.cell : undefined,
		defaultValue: initialCell ?? undefined,
		onValueChange: (next) => config?.onCellChange?.(next),
	})

	const raw = value ?? null

	// The last value of a controlled binding that the transition effect acted on.
	// A value past it is in flight: the effect has yet to write the rows it needs.
	// State, because the render reads it: the effect sets it, and the render that
	// follows reads the new value before paint.
	const [settled, setSettled] = useState<SettledCell>({ raw: initialCell, cell: initialCell })

	const candidate = controlled ? readControlledCell(raw, settled, editableRows, editSource) : raw

	// An uncontrolled coord that stranded once stays dropped. Masking alone would
	// survive as state, so the same row re-entering the set later would revive a
	// cell nobody opened and mount its editor alone. The grid cannot clear the
	// state here without a change report, so it records the stranded value
	// instead. A controlled value is the consumer's own, so it reads again when
	// its row opens again.
	const [maskedCell, setMaskedCell] = useState<GridActiveEdit | null>(null)

	const masked = !controlled && candidate !== null && candidate === maskedCell

	// Three things strand the coord. A binding can decline an entry, so the row
	// never joins the set; a consumer save can drop an editing row from under the
	// session; and `scope` or `session` can change under a live session, which
	// leaves a coord the current config would never have written.
	const stranded =
		candidate !== null && !masked && (!cellScoped || !editableRows.has(candidate.rowKey))

	// A cross-row entry that the rows binding declined reads as the cell it left,
	// while that cell's row is still open. The transition effect then writes the
	// state back to it, so no mask is necessary.
	const declined =
		stranded &&
		!controlled &&
		cellScoped &&
		entry !== null &&
		sameCell(candidate, entry.to) &&
		editableRows.has(entry.from.rowKey)

	// Adjusting the state here is React's answer to a value gone stale against its
	// input, and it beats an effect that resynchronizes a render late.
	if (stranded && !controlled && !declined) setMaskedCell(candidate)

	const live = stranded || masked ? null : candidate

	const activeEdit = declined ? entry.from : live

	return { raw, setValue, settled, setSettled, activeEdit }
}
