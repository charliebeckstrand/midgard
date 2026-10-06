import { afterEach, beforeEach } from 'vitest'
import { __resetAnnouncer } from '../../core/announcer'
import { __resetTruncationObserver } from '../../hooks/use-truncation'
import { __resetTextSelectionHold } from '../../utilities/hold-text-selection'

/**
 * Returns the package's module-scope state to its unused shape between tests.
 *
 * The `unit`, `pure`, `boundary`, and `geometry` projects and each browser
 * instance run `isolate: false`, so one module registry serves every file a worker or a page
 * runs. A module that holds state outside a component therefore carries it
 * across files, and the file that suffers is not the file that set it.
 *
 * This is the one place a reset is registered, so both setups call one function
 * and a new seam reaches every suite at once. Each reset also takes the hook it
 * needs here, because they need different ones.
 *
 * It is deliberately short. Eight modules hold module-scope state, and each
 * needs a measurement before it gains a seam. A proposed seam for the
 * media-query registries turned out to guard nothing: a registry drops itself
 * when its last subscriber unsubscribes, and cleanup unmounts every subscriber.
 * The four below are the ones with a mechanism rather than a suspicion. The
 * counter in `use-scroll-lock` and the holds in `use-drag-cursor` balance on unmount,
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

	// A case that presses a touch and never lifts it, or lifts it and ends before
	// the release delay, leaves `select-none` on `<html>` and the touch in the
	// held set. The next file then starts inside that hold, and its own release
	// never comes. An `afterEach`, for the same reason as the announcer.
	afterEach(__resetTextSelectionHold)

	// The PDF document cache holds each document that a case loads. A reset in
	// the body of a case does not empty it: the unmount in `cleanup` withdraws the
	// rail of the viewer, and that withdrawal adds an empty entry for the source
	// again. The next file then reads that entry as its own. An `afterEach`, so
	// that the reset runs after `cleanup`.
	//
	// The hook imports the cache when it runs. A static import here loads the
	// cache, and the `utilities` barrel that it imports, before the test file. A
	// `vi.mock` of a module in that graph then cannot replace it, as in
	// `runtime-hydration.test.tsx`.
	afterEach(async () => {
		const { resetDocumentCache } = await import(
			'../../components/pdf-viewer/pdf-viewer-document-cache'
		)

		resetDocumentCache()
	})

	// The shared ResizeObserver is built from whichever global existed at first
	// use, and several jsdom files stub that global. Vitest restores a stubbed
	// global before each test, after every `afterEach`, so only a `beforeEach`
	// sees the restored one. It drops the cache only when the global has moved,
	// so the suites that stub nothing keep their observer.
	beforeEach(__resetTruncationObserver)
}
