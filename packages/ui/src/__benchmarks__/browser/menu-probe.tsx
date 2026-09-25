/**
 * The menus the browser menu benches drive, plus the dispatch helpers they
 * share. Held in one place because the benches measure different things
 * through one surface. The keyboard bench times one arrow press. The pointer
 * bench times one sweep across the rows. The open bench times one click.
 *
 * Every probe here mounts open and settles before a bench registers against it.
 * What the keyboard and pointer benches measure is one input event on a menu
 * that is already up, not the cost of opening it. Nothing here settles a frame
 * inside a timed region, so no sample reads the frame period rather than the
 * work.
 *
 * `menu-open.bench.tsx` measures the open itself. It shares the {@link Dropdown}
 * below rather than declaring a second one, and mounts it closed.
 *
 * The probes stay mounted for the whole run, so the document carries one
 * escape-layer listener and one outside-press listener per probe. Measured
 * against a run holding one probe alone, that costs the 8-row rung about 7%
 * and the 64-row rung nothing, and no rung's standing moves. Every rung pays
 * the same set, so the report stays symmetric.
 */

import { Menu, MenuContent, MenuItem, MenuLabel, MenuSub, MenuTrigger } from '../../components/menu'
import { comboboxOptions, MENU_ROWS } from '../fixtures'
import { reactHost, settle } from './harness'

export { MENU_ROWS }

/** Rows inside the submenu of the corridor probe. */
const SUBMENU_ROWS = 6

/** Rows in the panel of the corridor probe, which its bench names as well. */
export const CORRIDOR_ROWS = 24

/** The rows a consumer writes: a label apiece. */
function Rows({ count }: { count: number }) {
	return (
		<>
			{comboboxOptions(count).map((option) => (
				<MenuItem key={option.value}>
					<MenuLabel>{option.label}</MenuLabel>
				</MenuItem>
			))}
		</>
	)
}

/**
 * One dropdown, open by default. Focus rests on the trigger, so the rows rove
 * by `aria-activedescendant`.
 *
 * @param open - Mount the panel open. Pass `false` for a closed menu a bench
 * then clicks open, which is what `menu-open.bench.tsx` measures.
 */
export function Dropdown({
	count,
	capped,
	panel,
	submenu = false,
	open = true,
}: {
	count: number
	capped: boolean
	panel: string
	submenu?: boolean
	open?: boolean
}) {
	return (
		<Menu placement="bottom-start" defaultOpen={open} capped={capped}>
			<MenuTrigger className={`${panel}-trigger`}>Options</MenuTrigger>

			<MenuContent className={panel}>
				{submenu ? (
					<MenuSub label="More" className={`${panel}-sub`}>
						<Rows count={SUBMENU_ROWS} />
					</MenuSub>
				) : null}

				<Rows count={count} />
			</MenuContent>
		</Menu>
	)
}

/** One open menu a bench drives: its trigger, and the point each row sits at. */
export type Probe = {
	trigger: HTMLElement
	/** The centre of each row, resolved once so no sample pays for the layout read. */
	points: { row: HTMLElement; x: number; y: number }[]
}

/** The client point at the middle of `node`. */
function center(node: HTMLElement): [number, number] {
	const rect = node.getBoundingClientRect()

	return [rect.left + rect.width / 2, rect.top + rect.height / 2]
}

/** Reads the handles off the panel `panel` names, less `skip` — a submenu's own parent row. */
function readProbe(panel: string, skip?: HTMLElement): Probe {
	const rows = [...document.querySelectorAll<HTMLElement>(`.${panel} [role="menuitem"]`)]

	return {
		trigger: document.querySelector<HTMLElement>(`.${panel}-trigger`) as HTMLElement,
		points: rows
			.filter((row) => row !== skip)
			.map((row) => {
				const [x, y] = center(row)

				return { row, x, y }
			}),
	}
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
	reactHost().render(<Dropdown count={count} capped={capped} panel={panel} />)

	await settle(3)

	return readProbe(panel)
}

/**
 * Mounts one open dropdown whose first row is a submenu, and hovers that
 * submenu open. Every arrival the probe hands back then runs the level's
 * travel test, which measures the open panel to read the pointer's course.
 *
 * @remarks The arrivals lie inside the corridor, on the course from the parent
 * row to the panel's near edge. The level reads that course off the event's
 * coordinates, not off the row it lands on. So each sibling row takes one
 * arrival at a later point on the course. Each one passes the travel test, and
 * the submenu stays open for the next. An arrival at a row's own centre shares
 * the parent's x, so the first of them fails the test and closes the submenu.
 * That leaves every later arrival nothing to measure.
 *
 * The probe runs one pass before it returns, and throws when the submenu has
 * closed, so the rung cannot time a plain sweep under the corridor's name.
 *
 * @returns One arrival for each sibling row, so a sweep never lands back on
 * the parent.
 */
export async function openCorridor(panel: string): Promise<Probe> {
	reactHost().render(<Dropdown count={CORRIDOR_ROWS} capped={false} panel={panel} submenu />)

	await settle(3)

	const parent = document.querySelector<HTMLElement>(`.${panel}-sub`) as HTMLElement

	const [x, y] = center(parent)

	pointerMove(parent, x, y)

	await settle(3)

	const submenu = document.getElementById(parent.getAttribute('aria-controls') ?? '')

	if (!submenu) throw new Error('the corridor probe did not open its submenu')

	const rect = submenu.getBoundingClientRect()

	const edge = rect.left >= x ? rect.left : rect.right

	const { trigger, points } = readProbe(panel, parent)

	const probe: Probe = {
		trigger,
		points: points.map(({ row }, index) => {
			const progress = (index + 1) / (points.length + 1)

			return { row, x: x + progress * (edge - x), y }
		}),
	}

	for (const { row, x: px, y: py } of probe.points) pointerMove(row, px, py)

	await settle(3)

	if (parent.getAttribute('aria-expanded') !== 'true') {
		throw new Error('a pass of the corridor probe closed its submenu')
	}

	return probe
}

/**
 * One mouse `pointermove` at a point, the arrival a sweep across the panel
 * makes. Deliberately not `harness.ts`'s own `pointerAt`, which also sends a
 * `mousemove` to keep dispatch symmetric across competing libraries. A menu has
 * no contender here, and the second event would inflate the dispatch floor the
 * keyboard bench subtracts.
 */
export function pointerMove(row: HTMLElement, x: number, y: number) {
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
