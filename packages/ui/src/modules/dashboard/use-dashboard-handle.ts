'use client'

import { type Ref, useImperativeHandle } from 'react'
import { announce } from '../../core'
import type { DashboardCommit } from './dashboard-gesture'
import { describeTidy } from './engine/dashboard-announcements'
import type { DashboardCell } from './engine/dashboard-layout'
import type { DashboardStore } from './engine/dashboard-store'
import { tidyCells } from './engine/dashboard-tidy'
import type { DashboardHandle } from './types'

/** Options for {@link useDashboardHandle}. @internal */
export type DashboardHandleOptions = {
	/** The `ref` of the `Dashboard`. */
	ref: Ref<DashboardHandle> | undefined
	/** The store of the board. */
	store: DashboardStore
	/** Writes cells into the saved layout through the layout binding. */
	commit: (cells: readonly DashboardCell[]) => DashboardCommit
}

/**
 * Binds the commands of a `Dashboard` to its `ref`. Each command reads the store
 * when it runs, so the handle keeps its identity for the life of the board.
 *
 * @internal
 */
export function useDashboardHandle({ ref, store, commit }: DashboardHandleOptions): void {
	useImperativeHandle(
		ref,
		() => ({
			tidy: () => {
				// A gesture owns the board until it ends, and its commit would drop the pack.
				if (store.getState().gesture !== null) return false

				const { canonical } = store.getView()

				const cells = tidyCells(canonical)

				// The pack keeps the object of each cell that stays, so identity counts the moves.
				const moved = cells.filter((cell, index) => cell !== canonical[index]).length

				announce(describeTidy(moved))

				if (moved === 0) return false

				const { failure } = commit(cells)

				if (failure !== undefined) throw failure.error

				return true
			},
		}),
		[store, commit],
	)
}
