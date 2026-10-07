import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeAll, beforeEach, expect, inject, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { loadListReorder } from '../../../components/list/use-list-reorder'
import { installSingletonResets } from '../../helpers/reset-singletons'
import { installResidueGuard } from '../../helpers/residue'
import '../../setup/geometry'
import { pageState } from './forensics'
import '../../../fonts/google-sans-flex-latin.js'
import './tailwind.css'

/**
 * Browser-suite setup. Registers the axe, jest-dom, and geometry matchers, sets the
 * waitFor/findBy budget, and tears down the DOM between cases. No `matchMedia`
 * / `ResizeObserver` stubs; the real engine provides them.
 */
expect.extend(toHaveNoViolations)

// The budget is provided by vitest.browser.config.ts, which owns the CI
// wall-clock headroom policy alongside testTimeout. Without this the suite that
// does real layout ran at RTL's own 1s default on every machine, while the
// jsdom projects took 4s on CI.
declare module 'vitest' {
	interface ProvidedContext {
		budgetFactor: number
	}
}

declare module 'vitest/browser' {
	interface BrowserCommands {
		/** Moves the real mouse off the tester iframe. `vitest.browser.config.ts` defines it. */
		parkPointer: () => Promise<void>
		/** Holds the real primary button down over the element that `selector` matches. `vitest.browser.config.ts` defines it. */
		pressPointer: (selector: string) => Promise<void>
		/** Releases the real primary button, over the element that `selector` matches when one is given. `vitest.browser.config.ts` defines it. */
		releasePointer: (selector?: string) => Promise<void>
	}
}

configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })

// `tailwind.css` gives the font of ui (`src/fonts/fonts.css`), and the script
// of `pnpm fonts` adds its latin face. The browser loads a font face only when
// text first needs it, and then it swaps the font in. A case that reads a text
// box at that moment reads the fallback face, and a later case reads the font.
// Each file thus loads the font before its first case, so each case measures
// the same face.
beforeAll(async () => {
	await document.fonts.load('1em "Google Sans Flex"')
})

// `@testing-library/user-event` puts a clipboard stub on `navigator`, and its
// `afterAll` removes the stub at the end of the first file that loads it. To
// remove the stub, it restores the own `clipboard` property that it found. In a
// browser, `clipboard` is a getter on `Navigator.prototype` and not an own
// property, so user-event writes an own `clipboard` property of `undefined`.
// Under `isolate: false` that property stays on the page. Each later file then
// reads `navigator.clipboard` as `undefined` until a user-event call adds a new
// stub. CI put `color-picker-press-focus` in that gap on #2023 and #2033.
//
// Each case starts with the browser's own clipboard, so the text that a case
// copies into a stub does not reach the next case. The next user-event call
// adds its stub again.
beforeEach(() => {
	Reflect.deleteProperty(navigator, 'clipboard')
})

installResidueGuard()

// Registered before the `afterEach` below, whose `cleanup` then runs first.
installSingletonResets()

// A case starts with the cursor off the page, whatever the case before it
// hovered. See `parkPointer` in `vitest.browser.config.ts`. It runs before the
// case renders, so a case that failed or timed out still hands on a clean page.
beforeEach(() => commands.parkPointer())

afterEach((ctx) => {
	// Read before cleanup, so the dump describes the page the failing test left,
	// and only when there is a failure to explain: the runner sets the result
	// state before it calls this hook, so the 583 green tests of a clean run pay
	// nothing. A dump built for every test would force a layout flush on the
	// largest tree in the suite, 583 times, and discard all but one.
	if (ctx.task.result?.state === 'fail') console.error(`page state at failure:\n  ${pageState()}`)

	// A fake clock that a case installs stays on the shared page when the case
	// times out, as in the jsdom setup. No file installs one today.
	vi.useRealTimers()

	cleanup()
})

// A reorderable `List` loads its `Reorder` parts after it mounts, and the rows
// mount again when they arrive. A case that drags a row at once would then
// depend on the order of the cases. The load before each file gives each case
// the state of a page that already loaded the parts.
// `list-reorder-hydration.test.tsx` checks a list that hydrates.
beforeAll(() => loadListReorder())
