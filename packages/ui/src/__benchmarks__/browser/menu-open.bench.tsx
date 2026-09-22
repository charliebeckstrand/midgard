/**
 * What a reader waits for when they click a menu open.
 *
 * Every other menu bench drives a panel that is already up. This one measures
 * the open. A closed menu renders no panel, so the click builds the whole
 * thing: the portal, the positioned wrapper, the animated surface, the
 * viewport, and every row.
 *
 * The timed region is the commit the click drives, from the event to the panel
 * in the DOM. It stops there. The engine places the panel a frame later, and a
 * frame costs 17.4 ms in this container, so a sample that waited for the
 * placement would report the frame rather than the work. What this bench reads
 * is the work the frame must hold.
 *
 * The click goes through `flushSync`, because a dispatch from a script is not
 * a user gesture and React defers the commit past the handler without it.
 *
 * An iteration mounts a closed menu, opens it, and tears the root down. It
 * never closes the menu through the trigger. A close starts an exit animation,
 * which keeps the panel mounted for several frames, so the next open of the
 * same menu would find the tree still up and rebuild none of it.
 *
 * Read the gaps, not the rows. `never opened` is the floor: the same mount, the
 * same address, and no click. Its teardown is of a closed tree, while every
 * rung above it tears down what the open built — the portal, the rows, and the
 * listeners. The step is therefore the open plus that teardown, and no closed
 * floor can subtract it. Read each step as an upper bound on the open alone.
 * The empty panel then separates the shell from the rows, and each row rung
 * reads against that.
 *
 * The held panels of the second scenario mount at module scope, so two open
 * panels and their listeners stand in the document while this scenario runs.
 * Every rung here pays that alike, so the steps stay symmetric.
 *
 * The second scenario prices what it costs to hold a panel open. A reposition
 * re-renders `Menu`, `MenuTrigger`, `MenuContent`, `FloatingSurface`, and
 * `PopoverPanel`; the rows keep their element identity and stand. `no rows` is
 * therefore the reposition, and the step to `24 rows` is what the rows would
 * add if a change reached them.
 *
 * The third scenario sizes one suspect against those two. `PopoverPanel` builds
 * its `className` from `k.panel.base`, `k.panel.surface`, `k.panel.ring`, and
 * `k.panel.glass`, which are arrays. `cn` memoizes only string, boolean, and
 * nullish arguments (`core/cn.ts`), so one array sends the whole call to an
 * un-memoized merge. Every open panel in the library therefore takes that path
 * on every render. The rung prices one such call against a pre-flattened
 * string, so a reader can weigh it against the open and the re-render above.
 *
 * `cn` touches no DOM, so `../recipe.bench.ts` is where its other rungs live.
 * This one sits here because the whole finding is a ratio. The open and the
 * re-render are the terms it divides into, and one engine must price all
 * three. The file already holds a browser, so the rung costs four windows.
 */

import { bench, describe } from 'vitest'
import { cn } from '../../core'
import { k as menu } from '../../recipes/kata/menu'
import { k } from '../../recipes/kata/popover'
import { reactHost, settle, WINDOW } from './harness'
import { Dropdown } from './menu-probe'

/** Rows the open ladder walks. The empty panel is the shell every later rung contains. */
const OPEN_ROWS = [0, 8, 24, 64] as const

/**
 * One iteration: mount a closed dropdown, address its trigger, open it, and
 * tear the root down.
 *
 * @param click - Open the menu. `false` gives the floor, which pays the same
 * mount, the same address, and the same teardown.
 */
function cycle(panel: string, count: number, click: boolean) {
	const mounted = reactHost()

	mounted.render(<Dropdown count={count} capped={false} panel={panel} open={false} />)

	const trigger = document.querySelector<HTMLElement>(`.${panel}-trigger`) as HTMLElement

	// `flushSync`, so the commit the click drives lands inside the timed region.
	if (click) mounted.flush(() => trigger.click())

	mounted.destroy()
}

describe('menu · one click, closed to panel', () => {
	// A closed dropdown renders none of its rows, so the floor takes no row
	// count, and one floor serves every rung below.
	bench(
		'never opened (the floor)',
		() => {
			cycle('menu-open-floor', 0, false)
		},
		WINDOW.slow,
	)

	for (const count of OPEN_ROWS) {
		bench(
			count === 0 ? 'open · empty panel' : `open · ${count} rows`,
			() => {
				cycle(`menu-open-${count}`, count, true)
			},
			WINDOW.slow,
		)
	}
})

/** Rows the re-render scenario holds open: the shell alone, and a real panel. */
const HELD_ROWS = [0, 24] as const

/**
 * Mounts one open dropdown and returns the re-render a bench drives it
 * through. Settles three frames first, so the engine has placed the panel and
 * no sample carries the first placement.
 *
 * @remarks The element is rebuilt per call rather than hoisted. React bails out
 * of a render that hands it the element it already holds, so a hoisted one
 * would measure nothing.
 */
async function holdOpen(count: number): Promise<() => void> {
	const panel = `menu-held-${count}`

	const mounted = reactHost()

	mounted.render(<Dropdown count={count} capped={false} panel={panel} />)

	await settle(3)

	return () => {
		mounted.render(<Dropdown count={count} capped={false} panel={panel} />)
	}
}

/** One held panel a bench re-renders: its row count, and the re-render itself. */
const held: { count: number; rerender: () => void }[] = []

for (const count of HELD_ROWS) {
	held.push({ count, rerender: await holdOpen(count) })
}

describe('menu · open panel, one re-render', () => {
	for (const { count, rerender } of held) {
		bench(
			count === 0 ? 'no rows (what a reposition rebuilds)' : `${count} rows`,
			rerender,
			WINDOW.slow,
		)
	}
})

/** What `MenuContent` hands `PopoverPanel` as its `className`. */
const CONTENT = cn('relative', menu.content)

/** The same two bundles, merged once at module scope — what a fix would ship. */
const FLAT_SURFACE = cn(k.panel.surface, k.panel.base)

const FLAT_GLASS = cn('group/glass', k.panel.glass, k.panel.ring, k.panel.base)

describe('cn · one panel className', () => {
	// The call `PopoverPanel` makes today, on its default surface and on glass.
	// The glass branch also builds a fresh array literal per render.
	bench('arrays · the surface branch (a memo miss)', () => {
		cn(k.panel.surface, k.panel.base, CONTENT)
	})

	bench('arrays · the glass branch (a memo miss)', () => {
		cn(['group/glass', k.panel.glass, k.panel.ring], k.panel.base, CONTENT)
	})

	bench('pre-flattened · the surface branch (a memo hit)', () => {
		cn(FLAT_SURFACE, CONTENT)
	})

	bench('pre-flattened · the glass branch (a memo hit)', () => {
		cn(FLAT_GLASS, CONTENT)
	})
})
