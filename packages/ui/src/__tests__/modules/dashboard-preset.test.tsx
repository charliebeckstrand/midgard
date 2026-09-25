import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
	Dashboard,
	type DashboardPreset,
	type DashboardSelection,
	type DashboardSpec,
	DashboardTiles,
	type DashboardWidget,
	DashboardWidgetProvider,
	startFromPreset,
	useDashboardScope,
} from '../../modules/dashboard'
import { fireEvent, renderUI, screen } from '../helpers'
import { Counter } from '../helpers/dashboard-board'

const SALES: DashboardPreset = {
	id: 'sales',
	label: 'Sales',
	spec: {
		tiles: [{ id: 'tile-1', widget: 'counter', title: 'Revenue' }],
		layout: [{ id: 'tile-1', x: 0, y: 0, w: 12, h: 10 }],
	},
}

const OPERATIONS: DashboardPreset = {
	id: 'operations',
	label: 'Operations',
	description: 'Stock and orders',
	spec: {
		tiles: [
			{ id: 'tile-1', widget: 'counter', title: 'Orders' },
			{ id: 'tile-2', widget: 'counter', title: 'Stock' },
		],
		layout: [
			{ id: 'tile-1', x: 0, y: 0, w: 8, h: 10 },
			{ id: 'tile-2', x: 8, y: 0, w: 8, h: 10 },
		],
	},
}

describe('startFromPreset', () => {
	it('returns the spec of a sound preset with no issue', () => {
		const { spec, issues } = startFromPreset(OPERATIONS)

		expect(spec).toEqual(OPERATIONS.spec)

		expect(issues).toEqual([])
	})

	it('passes the ids of the JSX tiles to the parse', () => {
		const notes = { id: 'notes', x: 12, y: 0, w: 12, h: 10 }

		const preset: DashboardPreset = {
			...SALES,
			spec: { ...SALES.spec, layout: [...SALES.spec.layout, notes] },
		}

		expect(startFromPreset(preset).spec.layout).not.toContain(notes)

		const { spec, issues } = startFromPreset(preset, { tileIds: ['notes'] })

		expect(spec.layout).toContain(notes)

		expect(issues).toEqual([])
	})

	it('gives the board new lists, so an edit never reaches the catalog', () => {
		const { spec } = startFromPreset(OPERATIONS)

		expect(spec).not.toBe(OPERATIONS.spec)

		expect(spec.tiles).not.toBe(OPERATIONS.spec.tiles)

		expect(spec.layout).not.toBe(OPERATIONS.spec.layout)
	})

	it('repairs a damaged preset, and reports each change', () => {
		const damaged = {
			id: 'damaged',
			label: 'Damaged',
			spec: {
				tiles: [
					{ id: 'a', widget: 'counter' },
					{ id: 'a', widget: 'counter' },
				],
				layout: [{ id: 'gone', x: 0, y: 0, w: 4 }],
			},
		} satisfies DashboardPreset

		const { spec, issues } = startFromPreset(damaged)

		expect(spec).toEqual({ tiles: [{ id: 'a', widget: 'counter' }], layout: [] })

		expect(issues.map((issue) => issue.kind)).toEqual(['duplicate-tile', 'orphan-entry'])
	})
})

/** A widget that says whether a selection filters it. */
function Scope() {
	return <p>{useDashboardScope().active ? 'Filtered' : 'Whole'}</p>
}

const WIDGETS: Readonly<Record<string, DashboardWidget>> = {
	counter: { render: () => <Counter /> },
	scope: { render: () => <Scope /> },
}

/** The pattern of the docs: a start replaces the spec, and the preset id keys the board. */
function Picker({ keyed }: { keyed: boolean }) {
	const [spec, setSpec] = useState<DashboardSpec>(() => startFromPreset(SALES).spec)

	const [board, setBoard] = useState(SALES.id)

	return (
		<DashboardWidgetProvider widgets={WIDGETS}>
			<button
				type="button"
				onClick={() => {
					setSpec(startFromPreset(OPERATIONS).spec)

					setBoard(OPERATIONS.id)
				}}
			>
				Start from Operations
			</button>

			<Dashboard key={keyed ? board : undefined} aria-label="Board" layout={{ value: spec.layout }}>
				<DashboardTiles tiles={spec.tiles} />
			</Dashboard>
		</DashboardWidgetProvider>
	)
}

describe('a start from a preset', () => {
	it('mounts each tile again when the preset id keys the board', () => {
		renderUI(<Picker keyed />)

		fireEvent.click(screen.getByRole('button', { name: 'Count 0' }))

		fireEvent.click(screen.getByRole('button', { name: 'Start from Operations' }))

		expect(screen.getByRole('group', { name: 'Orders' })).toHaveTextContent('Count 0')

		expect(screen.getByRole('group', { name: 'Stock' })).toBeInTheDocument()
	})

	it('keeps the widget state of a tile that keeps its id, without the key', () => {
		renderUI(<Picker keyed={false} />)

		fireEvent.click(screen.getByRole('button', { name: 'Count 0' }))

		fireEvent.click(screen.getByRole('button', { name: 'Start from Operations' }))

		// The reason for the key: tile-1 is now Orders, but it shows the count of Revenue.
		expect(screen.getByRole('group', { name: 'Orders' })).toHaveTextContent('Count 1')
	})
})

describe('the selection of a board that a start replaces', () => {
	// The selection that tile-1 of the old board made.
	const SELECTION: DashboardSelection[] = [{ source: 'tile-1', field: 'region', values: ['West'] }]

	const NEXT: DashboardPreset = {
		id: 'next',
		label: 'Next',
		spec: {
			tiles: [
				{ id: 'tile-1', widget: 'counter', title: 'Orders' },
				{ id: 'tile-2', widget: 'scope', title: 'Stock' },
			],
			layout: [],
		},
	}

	function Board({ clear }: { clear: boolean }) {
		const [spec, setSpec] = useState<DashboardSpec>(() => startFromPreset(SALES).spec)

		const [selection, setSelection] = useState(SELECTION)

		return (
			<DashboardWidgetProvider widgets={WIDGETS}>
				<button
					type="button"
					onClick={() => {
						setSpec(startFromPreset(NEXT).spec)

						if (clear) setSelection([])
					}}
				>
					Start
				</button>

				<Dashboard
					aria-label="Board"
					layout={{ value: spec.layout }}
					selection={{ value: selection, onValueChange: setSelection }}
				>
					<DashboardTiles tiles={spec.tiles} />
				</Dashboard>
			</DashboardWidgetProvider>
		)
	}

	it('filters the new board when the app keeps it, and not when the app clears it', () => {
		const kept = renderUI(<Board clear={false} />)

		fireEvent.click(screen.getByRole('button', { name: 'Start' }))

		expect(screen.getByRole('group', { name: 'Stock' })).toHaveTextContent('Filtered')

		kept.unmount()

		renderUI(<Board clear />)

		fireEvent.click(screen.getByRole('button', { name: 'Start' }))

		expect(screen.getByRole('group', { name: 'Stock' })).toHaveTextContent('Whole')
	})
})
