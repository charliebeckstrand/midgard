import { act, fireEvent, screen } from '@testing-library/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { afterEach, beforeEach, type Mock } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutBinding,
	type DashboardLayoutItem,
	type DashboardProps,
} from '../../modules/dashboard'
import { useDashboardStoreContext } from '../../modules/dashboard/context'
import type { DashboardStore } from '../../modules/dashboard/engine/dashboard-store'
import { present } from './present'

/**
 * Harnesses for the component suites of the dashboard.
 *
 * Not re-exported from `helpers/index.ts`. Only the dashboard suites use this
 * module, and that barrel reaches about 360 test files.
 */

/**
 * Gives the canvas of each board a width, in each case of the calling suite.
 *
 * @remarks
 * jsdom lays nothing out, so each element reports a `clientWidth` of 0. The
 * board divides the width of its canvas into the column pitch, and a gesture
 * starts only with a pitch. The stub answers for the canvas alone, so each
 * other element keeps the width that jsdom gives it.
 *
 * Call it once at the top level of a suite. It registers its own `beforeEach`
 * and `afterEach`.
 *
 * @param width - The width of the canvas, in px. The default gives a pitch of
 * 50 px at 24 columns.
 */
export function stubCanvasWidth(width = 1200): void {
	const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

	beforeEach(() => {
		Object.defineProperty(Element.prototype, 'clientWidth', {
			configurable: true,
			get(this: Element) {
				if (this.getAttribute('data-slot') === 'dashboard-canvas') return width

				return original?.get?.call(this) ?? 0
			},
		})
	})

	afterEach(() => {
		if (original) Object.defineProperty(Element.prototype, 'clientWidth', original)
	})
}

/**
 * Lets a keyboard lift attach its sensor before the cleanup of each case, so
 * that the unmount of the board ends the lift at once.
 *
 * @remarks
 * dnd-kit adds the keydown listener of the keyboard sensor to the document one
 * timer after a lift. When an assertion fails before that timer, the cleanup
 * unmounts the board first. The listener then attaches after the case, and it
 * lives into the next case. This `afterEach` runs before the cleanup, and its
 * wait runs that timer. The board then cancels the attached sensor when it
 * unmounts, and the sensor removes its listeners.
 *
 * Call it once at the top level of each suite that lifts a tile with the
 * keyboard.
 */
export function settleKeyboardLifts(): void {
	afterEach(() => act(() => new Promise((resolve) => setTimeout(resolve, 0))))
}

/**
 * A layout binding that saves each commit, as an app that holds its layout in
 * state does.
 *
 * @remarks
 * Use it in a board of the suite's own, so that each commit renders the board
 * again. Where the case gives the tiles, {@link ControlledDashboard} is shorter.
 *
 * @param initial - The first layout.
 * @param onLayout - Receives each committed layout before the save.
 * @returns The binding for the `layout` prop of the board.
 */
export function useControlledLayout(
	initial: DashboardLayoutItem[],
	onLayout?: (next: DashboardLayoutItem[]) => void,
): DashboardLayoutBinding {
	const [value, setValue] = useState(initial)

	return {
		value,
		onValueChange: (next) => {
			onLayout?.(next)

			setValue(next)
		},
	}
}

/** Omits `K` from each member of the union `T`, so that each accessible name stays. */
type OmitEach<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** The props of {@link ControlledDashboard}. */
export type ControlledDashboardProps = OmitEach<DashboardProps, 'layout'> & {
	/** The first layout. */
	initial: DashboardLayoutItem[]
	/** Receives each committed layout before the save. */
	onLayout?: (next: DashboardLayoutItem[]) => void
}

/**
 * A board that saves each commit through {@link useControlledLayout}. Each
 * other prop goes to the board.
 */
export function ControlledDashboard({ initial, onLayout, ...props }: ControlledDashboardProps) {
	return <Dashboard {...props} layout={useControlledLayout(initial, onLayout)} />
}

/**
 * The entry of `id` in the last layout that the board committed.
 *
 * @param onLayout - The spy that receives each committed layout.
 * @param id - The id of the tile.
 * @returns The entry, or `undefined` when no commit holds one.
 */
export function lastEntry(onLayout: Mock, id: string): DashboardLayoutItem | undefined {
	const layout = onLayout.mock.lastCall?.[0] as DashboardLayoutItem[] | undefined

	return layout?.find((item) => item.id === id)
}

/**
 * Presses one key on a splitter of the tile `name`.
 *
 * @param name - The name of the tile, as its splitters read it.
 * @param edge - The splitter. `0` is the east edge, which a right-to-left board
 * draws on the left, and `1` is the south edge.
 * @param key - The key to press.
 */
export function pressSplitter(name: string, edge: 0 | 1, key: string): void {
	const splitter = screen.getAllByRole('separator', { name: `Resize ${name}` })[edge]

	fireEvent.keyDown(present(splitter, `splitter ${edge} of ${name}`), { key })
}

/**
 * Gives the store of the board to `onStore` once, in a layout effect.
 *
 * @remarks
 * Put the probe first among the children of the board. Its effect then runs
 * before the effects of the tiles, so a spy on the store sees each registration.
 */
export function StoreProbe({ onStore }: { onStore: (store: DashboardStore) => void }) {
	const store = useDashboardStoreContext()

	const first = useRef(onStore)

	useLayoutEffect(() => {
		first.current(store)
	}, [store])

	return null
}

/** A widget with its own state, as a grid holds its sort. Each click counts up. */
export function Counter() {
	const [count, setCount] = useState(0)

	return (
		<button type="button" onClick={() => setCount((value) => value + 1)}>
			{`Count ${count}`}
		</button>
	)
}
