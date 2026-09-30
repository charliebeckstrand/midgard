import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GROUP_PREFIX, UNGROUPED, zoneDropId } from '../../modules/grid/engine/grid-zone/map'
import type { GridColumnGroup } from '../../modules/grid/grid-group-types'
import type { GridColumnManagerItem } from '../../modules/grid/types'
import { useGridGroupManager } from '../../modules/grid/use-grid-group-manager'

const columns: GridColumnManagerItem[] = [
	{ id: 'a', title: 'A' },
	{ id: 'b', title: 'B' },
	{ id: 'c', title: 'C' },
	{ id: 'd', title: 'D' },
]

const baseGroups: GridColumnGroup[] = [
	{ id: 'g1', title: 'One', columns: ['a', 'b'] },
	{ id: 'g2', title: 'Two', columns: [] },
]

type Box = { top: number; height: number }

const box = ({ top, height }: Box) => ({
	top,
	height,
	left: 0,
	width: 100,
	right: 100,
	bottom: top + height,
})

/** A dnd-kit drag event with only the fields that the hook reads. */
function dragEvent(
	activeId: string,
	overId: string | null,
	geometry: { active?: Box | null; over?: Box } = {},
): DragStartEvent & DragOverEvent & DragEndEvent {
	const translated = geometry.active ? box(geometry.active) : null

	return {
		active: { id: activeId, rect: { current: { translated, initial: null } } },
		over: overId ? { id: overId, rect: box(geometry.over ?? { top: 0, height: 20 }) } : null,
	} as unknown as DragStartEvent & DragOverEvent & DragEndEvent
}

function setup(groups: GridColumnGroup[] = baseGroups) {
	const onGroupsChange = vi.fn()

	const onOrderChange = vi.fn()

	const order = columns.map((c) => c.id)

	const hook = renderHook(() =>
		useGridGroupManager({ groups, onGroupsChange, columns, order, onOrderChange }),
	)

	return { hook, onGroupsChange, onOrderChange }
}

describe('useGridGroupManager actions', () => {
	it('derives the zone map from the groups and the orderable columns', () => {
		const { hook } = setup()

		expect(hook.result.current.zoneMap).toEqual({
			g1: ['a', 'b'],
			g2: [],
			[UNGROUPED]: ['c', 'd'],
		})

		expect(hook.result.current.activeId).toBeNull()
	})

	it('adds an empty group with a new id on each call', () => {
		const { hook, onGroupsChange } = setup()

		act(() => {
			hook.result.current.addGroup()

			hook.result.current.addGroup()
		})

		const [first] = onGroupsChange.mock.calls[0] ?? []

		const [second] = onGroupsChange.mock.calls[1] ?? []

		expect(first.at(-1)).toMatchObject({ title: 'New group', columns: [] })

		expect(first.at(-1).id).not.toBe(second.at(-1).id)
	})

	it('commits remove, rename, recolor, and assign through onGroupsChange', () => {
		const { hook, onGroupsChange } = setup()

		const api = hook.result.current

		api.removeGroup('g2')

		api.renameGroup('g1', 'Renamed')

		api.recolorGroup('g1', 'violet')

		api.assign('c', 'g2')

		const committed = onGroupsChange.mock.calls.map(([next]) => next as GridColumnGroup[])

		expect(committed[0]?.map((g) => g.id)).toEqual(['g1'])

		expect(committed[1]?.[0]?.title).toBe('Renamed')

		expect(committed[2]?.[0]?.color).toBe('violet')

		expect(committed[3]?.[1]?.columns).toEqual(['c'])
	})
})

describe('useGridGroupManager column drag', () => {
	it('moves a column into another zone live, and commits groups and order on drop', () => {
		const { hook, onGroupsChange, onOrderChange } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent('c', null)))

		expect(hook.result.current.activeId).toBe('c')

		// The pointer sits above the midpoint of "a", so "c" goes in before it.
		act(() =>
			hook.result.current.handleDragOver(
				dragEvent('c', 'a', { active: { top: 0, height: 20 }, over: { top: 0, height: 20 } }),
			),
		)

		expect(hook.result.current.zoneMap).toEqual({
			g1: ['c', 'a', 'b'],
			g2: [],
			[UNGROUPED]: ['d'],
		})

		// After the live move, the dragged row sits over its own new slot.
		act(() => hook.result.current.handleDragEnd(dragEvent('c', 'c')))

		expect(onGroupsChange.mock.calls[0]?.[0][0].columns).toEqual(['c', 'a', 'b'])

		expect(onOrderChange).toHaveBeenCalledTimes(1)

		// The override clears, so the zone map comes from the props again.
		expect(hook.result.current.activeId).toBeNull()

		expect(hook.result.current.zoneMap[UNGROUPED]).toEqual(['c', 'd'])
	})

	it('inserts after the over-item when the pointer is below its midpoint', () => {
		const { hook } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent('c', null)))

		act(() =>
			hook.result.current.handleDragOver(
				dragEvent('c', 'a', { active: { top: 15, height: 20 }, over: { top: 0, height: 20 } }),
			),
		)

		expect(hook.result.current.zoneMap.g1).toEqual(['a', 'c', 'b'])
	})

	it('inserts before the over-item when the drag has no translated rect', () => {
		const { hook } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent('c', null)))

		act(() => hook.result.current.handleDragOver(dragEvent('c', 'b', { active: null })))

		expect(hook.result.current.zoneMap.g1).toEqual(['a', 'c', 'b'])
	})

	it('seeds the live map from the props when a drag over arrives first', () => {
		const { hook } = setup()

		act(() => hook.result.current.handleDragOver(dragEvent('d', zoneDropId('g2'))))

		expect(hook.result.current.zoneMap.g2).toEqual(['d'])
	})

	it('keeps the zone map when the drag is over no droppable', () => {
		const { hook } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent('c', null)))

		const before = hook.result.current.zoneMap

		act(() => hook.result.current.handleDragOver(dragEvent('c', null)))

		expect(hook.result.current.zoneMap).toBe(before)
	})

	it('reorders the ungrouped pool on a drop in its own zone', () => {
		const { hook, onOrderChange } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent('d', null)))

		act(() => hook.result.current.handleDragEnd(dragEvent('d', 'c')))

		expect(onOrderChange).toHaveBeenCalledWith(['a', 'b', 'd', 'c'])
	})

	it('commits nothing on a drop over no droppable, or with no drag start', () => {
		const { hook, onGroupsChange, onOrderChange } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent('c', null)))

		act(() => hook.result.current.handleDragEnd(dragEvent('c', null)))

		// A drop that no drag start came before has no live map to commit.
		act(() => hook.result.current.handleDragEnd(dragEvent('c', 'a')))

		expect(onGroupsChange).not.toHaveBeenCalled()

		expect(onOrderChange).not.toHaveBeenCalled()

		expect(hook.result.current.activeId).toBeNull()
	})

	it('drops the live map on cancel, and commits nothing', () => {
		const { hook, onGroupsChange } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent('c', null)))

		act(() => hook.result.current.handleDragOver(dragEvent('c', 'a')))

		act(() => hook.result.current.handleDragCancel())

		expect(hook.result.current.activeId).toBeNull()

		expect(hook.result.current.zoneMap[UNGROUPED]).toEqual(['c', 'd'])

		expect(onGroupsChange).not.toHaveBeenCalled()
	})
})

describe('useGridGroupManager group drag', () => {
	const g1 = `${GROUP_PREFIX}g1`

	const g2 = `${GROUP_PREFIX}g2`

	it('reorders the groups on a drop over another group', () => {
		const { hook, onGroupsChange, onOrderChange } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent(g2, null)))

		expect(hook.result.current.activeId).toBe(g2)

		// A group drag does not move columns between zones.
		const before = hook.result.current.zoneMap

		act(() => hook.result.current.handleDragOver(dragEvent(g2, g1)))

		expect(hook.result.current.zoneMap).toBe(before)

		act(() => hook.result.current.handleDragEnd(dragEvent(g2, g1)))

		expect(onGroupsChange.mock.calls[0]?.[0].map((g: GridColumnGroup) => g.id)).toEqual([
			'g2',
			'g1',
		])

		expect(onOrderChange).not.toHaveBeenCalled()

		expect(hook.result.current.activeId).toBeNull()
	})

	it('commits nothing on a group drop over no droppable', () => {
		const { hook, onGroupsChange } = setup()

		act(() => hook.result.current.handleDragStart(dragEvent(g1, null)))

		act(() => hook.result.current.handleDragEnd(dragEvent(g1, null)))

		expect(onGroupsChange).not.toHaveBeenCalled()

		expect(hook.result.current.activeId).toBeNull()
	})
})
