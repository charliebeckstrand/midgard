import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeAll, inject, vi } from 'vitest'
import { loadListReorder } from '../../components/list/use-list-reorder'
import { loadTooltipBody } from '../../components/tooltip/tooltip-body-loader'
import { installSingletonResets } from '../helpers/reset-singletons'
import { installResidueGuard } from '../helpers/residue'

import './geometry'
import './jsdom-stubs'
import './locale-guard'

declare module 'vitest' {
	interface ProvidedContext {
		asyncUtilTimeout: number
	}
}

// The waitFor/findBy budget is provided by vitest.config.ts, which owns the
// CI wall-clock headroom policy alongside testTimeout.
configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })

// The `unit` project shares one jsdom window across every file a worker runs,
// which is the condition the browser suite's residue guard was written for.
// `cleanup()` removes the containers React owns and nothing else, so a node a
// case appended to the body outlives it. See `helpers/residue.ts` for the
// placement this registration depends on.
installResidueGuard()

// RTL sets `IS_REACT_ACT_ENVIRONMENT` in a `beforeAll` that it registers when
// its module loads, and it restores the old value in an `afterAll`. Under
// `isolate: false`, the module loads one time for each worker. Thus only the
// first file of a worker gets the hook, and each file after it runs with the
// flag that the `afterAll` restored. A direct `act()` from `react` then logs
// "The current testing environment is not configured to support act(...)".
// This file runs again for each file, so this hook sets the flag for each file.
beforeAll(() => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

// `TooltipContent` loads its panel module on the first hover or focus, and
// `sequence.shuffle` decides which case of a worker is the first to open a
// tooltip. The load before each file gives each case the state of a page that
// already loaded the panel, so a case that reads an open panel at once does not
// depend on the order. The `floating-ui` browser project opens tooltips with no
// such load.
beforeAll(() => loadTooltipBody())

// A reorderable `List` loads its `Reorder` parts after it mounts, and the rows
// mount again when they arrive. A case that drags or lifts a row at once would
// then depend on the order of the cases. The load before each file gives each
// case the state of a page that already loaded the parts.
beforeAll(() => loadListReorder())

// Registered before the `afterEach` below, whose `cleanup` then runs first.
installSingletonResets()

afterEach(() => {
	// Fifteen files install a fake clock, and a `finally` in a case restores it
	// when the body throws but not when the runner aborts the body at
	// `testTimeout`. The clock then leaks into the next case and, on a shared
	// worker, into the next file. `useRealTimers` is guarded internally, so this
	// is a no-op wherever no clock is installed, and no file in the package
	// installs one in a `beforeAll` that it means to outlive a case.
	vi.useRealTimers()

	cleanup()

	// `userEvent.setup()` puts a clipboard stub on the navigator. user-event
	// registers the hooks that reset and remove the stub when its module loads,
	// thus only in the first file of a worker. Without this removal, the stub and
	// the text that a case copies stay for each later case and file.
	Reflect.deleteProperty(navigator, 'clipboard')
})
