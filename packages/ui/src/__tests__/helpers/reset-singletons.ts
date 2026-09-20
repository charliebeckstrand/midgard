import { __resetAnnouncer } from '../../core/announcer'
import { __resetTruncationObserver } from '../../hooks/use-truncation'

/**
 * Returns the package's module-scope state to its unused shape between tests.
 *
 * Every project runs `isolate: false`, so one module registry serves every file
 * a worker or a page runs. A module that holds state outside a component
 * therefore carries it across files, and the file that suffers is not the file
 * that set it.
 *
 * This is the one place a reset is registered, so both setups call one function
 * and a new seam reaches every suite at once.
 *
 * It is deliberately short. The 2026-09-11 test architecture document lists
 * seven modules with module-scope state and asks for a measurement before each
 * gains a seam, because a proposed seam for the media-query registries turned
 * out to guard nothing: a registry drops itself when its last subscriber
 * unsubscribes, and cleanup unmounts every subscriber. The two below are the
 * ones with a mechanism rather than a suspicion. The counters in
 * `use-scroll-lock` and `use-grabbing-cursor` balance on unmount, the
 * `document-listener` registries drop themselves like the media-query ones, and
 * the time-ago ticker's `visibilityBound` flag and the PDF viewer's
 * `sharedWorker` are both bound once and idempotent. Measure one before adding
 * it here.
 */
export function resetSingletons(): void {
	// The live regions sit on document.body, outside React's tree, so cleanup
	// does not remove them.
	__resetAnnouncer()

	// The shared ResizeObserver is built from whichever global existed at first
	// use, and four jsdom files stub that global.
	__resetTruncationObserver()
}
