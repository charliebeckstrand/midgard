// The recovery of a page whose HTML names files that a deploy removed. Each
// deploy replaces the hashed files under `/assets`. A browser can restore a
// tab from cached HTML, such as when iOS discards a tab in the background and
// the reader comes back to it. When that HTML names a removed file, the host
// gives the fallback page for it, and the module script of the page fails.
// The page then shows its prerendered markup, but it does not hydrate, so no
// control works. A reload gets the new HTML.

declare global {
	interface Window {
		/** Stops the watch of the head script. The client entry calls it. */
		__staleBuild?: () => void
		/** The manifest of React Router. Its `url` names the manifest file of the build of the page. */
		__reactRouterManifest?: { url?: string }
	}
}

/** The `sessionStorage` key of the time of the last reload. */
const RELOADED = 'docs:stale-reload'

/** The time, in ms, in which a second failure does not reload, so a build that stays broken does not loop. */
const GUARD = 10_000

// The head script. Until the client entry runs, a script or a module preload
// that fails, or a promise that rejects with no handler, reloads the page one
// time. The import of the entry is a promise of the module script. A failed
// load is an `error` event on its element, which does not bubble, so the
// listener captures it on the window. The error of a script that runs has the
// window as its target, so it does not match.
const SCRIPT = `(function(){var w=window;function f(e){var t=e.target;if(e.type==='error'&&!(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK'&&t.rel==='modulepreload')))return;try{if(Date.now()-Number(sessionStorage.getItem(${JSON.stringify(RELOADED)}))<${GUARD})return;sessionStorage.setItem(${JSON.stringify(RELOADED)},String(Date.now()))}catch(x){return}s();location.reload()}
function s(){w.removeEventListener('error',f,true);w.removeEventListener('unhandledrejection',f);delete w.__staleBuild}
w.addEventListener('error',f,true);w.addEventListener('unhandledrejection',f);w.__staleBuild=s})()`

/** The head script that reloads a page whose scripts fail before the client entry runs. Render it in the `<head>`, before the scripts. */
export function StaleBuildScript() {
	return <script>{SCRIPT}</script>
}

/**
 * Ends the watch of {@link StaleBuildScript}. The client entry calls it first:
 * when the entry runs, each file that the page names has loaded. A failure
 * after this point, such as a load in idle time, does not reload the page.
 */
export function endStaleBuildWatch(): void {
	window.__staleBuild?.()
}

// A page can also start from cached HTML whose files are all in the cache, so
// it hydrates. Its other chunks are not in the cache, and the deploy removed
// them. Each later load of a chunk then fails, such as the features of Motion
// that animate an open, or the API reference. A tab that stays open across a
// deploy has the same problem. The client entry thus checks that the manifest
// file of the page is still on the host. The name of that file changes with
// each build.

/**
 * Whether the host no longer has the manifest file of the page. A file that a
 * deploy removed gets the fallback page, which is HTML. A failed request, or
 * a status other than 200 and 404, gives `false`, so a bad network does not
 * reload the page.
 */
async function isStale(): Promise<boolean> {
	const url = window.__reactRouterManifest?.url

	if (!url) return false

	try {
		const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })

		if (response.status === 404) return true

		return response.ok && !response.headers.get('content-type')?.includes('javascript')
	} catch {
		return false
	}
}

/** Reloads the page, unless the page reloaded in the last {@link GUARD} ms. */
function reloadOnce(): void {
	try {
		if (Date.now() - Number(sessionStorage.getItem(RELOADED)) < GUARD) return

		sessionStorage.setItem(RELOADED, String(Date.now()))
	} catch {
		return
	}

	location.reload()
}

/** Whether a check is in progress, so that two events do not start two checks. */
let checking = false

async function check(): Promise<void> {
	if (checking) return

	checking = true

	try {
		if (await isStale()) reloadOnce()
	} finally {
		checking = false
	}
}

/**
 * Reloads the page when a deploy replaced the build of the page. The client
 * entry calls it after {@link endStaleBuildWatch}. The check runs one time at
 * the start, and again each time that the reader comes back to the tab. The
 * reload gets the HTML and the files of the new build.
 */
export function watchStaleBuild(): void {
	void check()

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') void check()
	})

	// A page that the browser restores from its back-forward cache fires `pageshow`.
	window.addEventListener('pageshow', (event) => {
		if (event.persisted) void check()
	})
}
