/**
 * The mounted, open menus the browser menu benches drive, plus the dispatch
 * helpers they share. Held in one place because the two benches measure
 * different things through one surface. The keyboard bench times one arrow
 * press. The pointer bench times one sweep across the rows.
 *
 * Every probe mounts open and settles before a bench registers against it.
 * What these benches measure is one input event on a menu that is already up,
 * not the cost of opening it. Nothing here settles a frame inside a timed
 * region, so no sample reads the frame period rather than the work.
 *
 * The probes stay mounted for the whole run, so the document carries one
 * escape-layer listener and one outside-press listener per probe. Each bails
 * on the first key comparison, and every rung pays the same set, so the cost
 * is symmetric across the report.
 */

import { Menu, MenuContent, MenuItem, MenuLabel, MenuSub, MenuTrigger } from '../../components/menu'
import { comboboxOptions } from '../fixtures'
import { reactHost, settle } from './harness'

/** Row counts every menu scenario sweeps: a toolbar menu, a column menu, an overflowing one. */
export const ROWS = [8, 24, 64] as const

/** Rows inside each submenu of the corridor probe. */
const SUBMENU_ROWS = 6

/** One open dropdown. Focus rests on the trigger, so the rows rove by `aria-activedescendant`. */
function Dropdown({
	count,
	capped,
	panel,
	submenu = false,
}: {
	count: number
	capped: boolean
	panel: string
	submenu?: boolean
}) {
	const rows = comboboxOptions(count)

	return (
		<Menu placement="bottom-start" defaultOpen capped={capped}>
			<MenuTrigger className={`${panel}-trigger`}>Options</MenuTrigger>

			<MenuContent className={panel}>
				{submenu ? (
					<MenuSub label="More" className={`${panel}-sub`}>
						{comboboxOptions(SUBMENU_ROWS).map((option) => (
							<MenuItem key={option.value}>
								<MenuLabel>{option.label}</MenuLabel>
							</MenuItem>
						))}
					</MenuSub>
				) : null}

				{rows.map((option) => (
					<MenuItem key={option.value}>
						<MenuLabel>{option.label}</MenuLabel>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	)
}

/** One open menu a bench drives: its trigger, its rows, and the points they sit at. */
export type Probe = {
	trigger: HTMLElement
	rows: HTMLElement[]
	/** The centre of each row, resolved once so no sample pays for the layout read. */
	points: { row: HTMLElement; x: number; y: number }[]
}

/** Every `[role="menuitem"]` inside the panel `panel` names, in DOM order. */
function panelRows(panel: string): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>(`.${panel} [role="menuitem"]`)]
}

/**
 * Mounts one open dropdown and returns the handles a bench drives it through.
 *
 * @remarks Settles three frames before it measures anything. The engine places
 * the panel one frame after the mount, and a capped viewport only overflows
 * once it has its height. A probe read any earlier reports an unplaced panel at
 * the wrapper's origin.
 */
export async function openDropdown(count: number, capped: boolean, panel: string): Promise<Probe> {
	const mounted = reactHost()

	mounted.render(<Dropdown count={count} capped={capped} panel={panel} />)

	await settle(3)

	const rows = panelRows(panel)

	return {
		trigger: document.querySelector<HTMLElement>(`.${panel}-trigger`) as HTMLElement,
		rows,
		points: rows.map((row) => {
			const rect = row.getBoundingClientRect()

			return { row, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
		}),
	}
}

/**
 * Mounts one open dropdown whose first row is a submenu, and hovers that
 * submenu open. Every later arrival on a sibling row then runs the level's
 * travel test, which measures the open panel to read the pointer's course.
 *
 * @returns The sibling rows alone, so a sweep never lands back on the parent.
 */
export async function openCorridor(count: number, panel: string): Promise<Probe> {
	const mounted = reactHost()

	mounted.render(<Dropdown count={count} capped={false} panel={panel} submenu />)

	await settle(3)

	const parent = document.querySelector<HTMLElement>(`.${panel}-sub`) as HTMLElement

	pointerAt(parent, ...centre(parent))

	await settle(3)

	const rows = panelRows(panel).filter((row) => row !== parent)

	return {
		trigger: document.querySelector<HTMLElement>(`.${panel}-trigger`) as HTMLElement,
		rows,
		points: rows.map((row) => {
			const [x, y] = centre(row)

			return { row, x, y }
		}),
	}
}

/** The client point at the middle of `node`. */
function centre(node: HTMLElement): [number, number] {
	const rect = node.getBoundingClientRect()

	return [rect.left + rect.width / 2, rect.top + rect.height / 2]
}

/** One mouse `pointermove` at a point, the arrival a sweep across the panel makes. */
export function pointerAt(row: HTMLElement, x: number, y: number) {
	row.dispatchEvent(
		new PointerEvent('pointermove', {
			bubbles: true,
			pointerType: 'mouse',
			clientX: x,
			clientY: y,
		}),
	)
}

/** One `keydown` on `target`, the press the trigger's roving handler reads. */
export function pressKey(target: HTMLElement, key: string) {
	target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
}
