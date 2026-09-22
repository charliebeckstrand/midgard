import { afterEach, beforeEach } from 'vitest'
import { __resetAnnouncer } from '../../core/announcer'
import { __resetTruncationObserver } from '../../hooks/use-truncation'

/**
 * Returns the package's module-scope state to its unused shape between tests.
 *
 * The `unit`, `pure`, and `boundary` projects and both browser instances run
 * `isolate: false`, so one module registry serves every file a worker or a page
 * runs. A module that holds state outside a component therefore carries it
 * across files, and the file that suffers is not the file that set it.
 *
 * This is the one place a reset is registered, so both setups call one function
 * and a new seam reaches every suite at once. Each reset also takes the hook it
 * needs here, because the two need different ones.
 *
 * It is deliberately short. Seven modules hold module-scope state, and each
 * needs a measurement before it gains a seam. A proposed seam for the
 * media-query registries turned out to guard nothing: a registry drops itself
 * when its last subscriber unsubscribes, and cleanup unmounts every subscriber.
 * The two below are the ones with a mechanism rather than a suspicion. The
 * counters in `use-scroll-lock` and `use-grabbing-cursor` balance on unmount,
 * the `document-listener` registries drop themselves like the media-query ones,
 * and the time-ago ticker's `visibilityBound` flag and the PDF viewer's
 * `sharedWorker` are both bound once and idempotent. Measure one before adding
 * it here.
 */
export function installSingletonResets(): void {
	// The live regions sit on document.body, outside React's tree, so cleanup
	// does not remove them. An `afterEach`, because the residue guard reads the
	// body once every `afterEach` has run.
	afterEach(__resetAnnouncer)

	// The shared ResizeObserver is built from whichever global existed at first
	// use, and several jsdom files stub that global. Vitest restores a stubbed
	// global before each test, after every `afterEach`, so only a `beforeEach`
	// sees the restored one. It drops the cache only when the global has moved,
	// so the suites that stub nothing keep their observer.
	beforeEach(__resetTruncationObserver)
}
