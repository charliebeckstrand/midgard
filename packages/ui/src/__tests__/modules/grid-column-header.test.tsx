import type { DraggableSyntheticListeners } from '@dnd-kit/core'
import { fireEvent } from '@testing-library/react'
import { createPortal } from 'react-dom'
import { describe, expect, it, vi } from 'vitest'
import { GridSettleContext } from '../../modules/grid/context'
import { createSettleStore } from '../../modules/grid/engine/grid-sizing/settle'
import {
	type GridColumnSortable,
	GridReorderableColumnHeaderView,
} from '../../modules/grid/grid-column-header'
import { GridGroupByContext } from '../../modules/grid/grid-group-by-button'
import { renderUI, screen } from '../helpers'

/** A title that portals a button to the body, as a sheet that the header opens does. */
function PortaledTitle() {
	return (
		<>
			Name
			{createPortal(<button type="button">In the sheet</button>, document.body)}
		</>
	)
}

/** A handle-less header with spy drag listeners in place of the dnd-kit ones. */
function renderHeader(listeners: NonNullable<DraggableSyntheticListeners>) {
	const sortable: GridColumnSortable = {
		setNodeRef: () => {},
		setActivatorNodeRef: () => {},
		attributes: undefined,
		listeners,
		x: 0,
		isDragging: false,
		isSorting: false,
	}

	renderUI(
		<GridSettleContext value={createSettleStore()}>
			<GridGroupByContext value={null}>
				<table>
					<thead>
						<tr>
							<GridReorderableColumnHeaderView
								column={{ id: 'name', title: <PortaledTitle /> }}
								ariaColIndex={1}
								columnIndex={0}
								sorted={false}
								direction={undefined}
								sortPriority={undefined}
								stickyHeader={false}
								toggleSort={() => {}}
								width={undefined}
								size={undefined}
								least={undefined}
								resizeActions={null}
								minWidth={0}
								maxWidth={Number.POSITIVE_INFINITY}
								resizing={false}
								interactive
								gridCol="name"
								gridFit={undefined}
								filter={null}
								filterQuery={undefined}
								pinning={null}
								pinColumn={() => {}}
								locked={false}
								handle={false}
								sortable={sortable}
							/>
						</tr>
					</thead>
				</table>
			</GridGroupByContext>
		</GridSettleContext>,
	)
}

describe('GridReorderableColumnHeaderView without a handle', () => {
	it('arms the drag on a press on the header cell', () => {
		const onPointerDown = vi.fn()

		renderHeader({ onPointerDown })

		fireEvent.pointerDown(screen.getByRole('columnheader'))

		expect(onPointerDown).toHaveBeenCalledOnce()
	})

	// React carries the events of a portal up through its React ancestors. A
	// press in a sheet that the header opened is not a press on the header.
	it('does not arm the drag on a press in a portaled surface', () => {
		const onPointerDown = vi.fn()

		const onKeyDown = vi.fn()

		renderHeader({ onPointerDown, onKeyDown })

		const portaled = screen.getByRole('button', { name: 'In the sheet' })

		expect(screen.getByRole('columnheader')).not.toContainElement(portaled)

		fireEvent.pointerDown(portaled)

		fireEvent.keyDown(portaled, { key: ' ' })

		expect(onPointerDown).not.toHaveBeenCalled()

		expect(onKeyDown).not.toHaveBeenCalled()
	})
})
