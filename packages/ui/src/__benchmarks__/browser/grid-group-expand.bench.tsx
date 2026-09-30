/**
 * The expand of one closed group on a windowed grid, at 10k rows grouped by
 * carrier, with every group closed at mount.
 *
 * Each sample clicks the disclosure of the first group under `flushSync`, then
 * waits one task. React runs the render that drops the entering rows in that
 * task, so the sample holds each commit of the expand. The sample then closes
 * the group in the same way. The sample settles on no frame, because a frame
 * in the headless container reads the frame and not the work (README).
 *
 * Before the benches register, the file logs the parts of one expand: the
 * commits of the click, the task after it, and the renders of the grouped
 * body (`render-count.ts`).
 */

import './render-count'

import { flushSync } from 'react-dom'
import { bench, describe } from 'vitest'
import { shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, grids, painted } from './grids'
import { host, settle, WINDOW } from './harness'
import { readRenders, resetRenders } from './render-count'

/** Resolves after one task, which runs after each task that React scheduled before the call. */
function task() {
	return new Promise<void>((resolve) => {
		const channel = new MessageChannel()

		channel.port1.onmessage = () => resolve()

		channel.port2.postMessage(null)
	})
}

const rows = shipments(10_000)

const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

const [subject] = grids()

if (!subject) throw new Error('grid expand bench found no grid')

subject.mount(box, rows, { grouped: true, collapsed: true })

await painted(box, ['Carrier'])

await settle()

const header = box.querySelector<HTMLElement>('[data-group-row]')

const disclosure = header?.querySelector<HTMLElement>('button[aria-expanded]')

const carrier = header?.getAttribute('data-group-key')

const leaf = rows.find((row) => row.carrier === carrier)?.id

if (!disclosure || !leaf) throw new Error('grid expand bench found no group to open')

/** Opens or closes the first group, and commits the click. */
function toggle() {
	flushSync(() => disclosure?.click())
}

/** The body renders and the commits since the last reset. */
const bodyRenders = () => readRenders(['GridVirtualizedGroupedBody'])

// One expand, in parts, before the benches register.
resetRenders()

const start = performance.now()

toggle()

const clicked = performance.now()

const sync = bodyRenders()

await task()

const done = performance.now()

const after = bodyRenders()

console.log(
	[
		`grid expand · click ${(clicked - start).toFixed(1)}ms,`,
		`${sync.commits} commits, ${sync.GridVirtualizedGroupedBody} body renders ·`,
		`task ${(done - clicked).toFixed(1)}ms, ${after.commits - sync.commits} commits,`,
		`${(after.GridVirtualizedGroupedBody ?? 0) - (sync.GridVirtualizedGroupedBody ?? 0)} body renders`,
	].join(' '),
)

toggle()

await task()

describe('grid group · 10,000 rows · expand + collapse', () => {
	bench(
		subject.name,
		async () => {
			toggle()

			await painted(box, [leaf])

			await task()

			toggle()

			await task()
		},
		WINDOW.slow,
	)
})
