// The recovery of a page whose files do not load. Each deploy replaces the
// hashed files under `/assets`. A browser can restore a tab from cached HTML,
// such as when iOS discards a tab in the background and the reader comes back
// to it. When that HTML names a removed file, the host answers 404 for it,
// and the module script of the page fails. The page then shows its
// prerendered markup, but it does not hydrate, so no control works. A reload
// gets the new HTML.
//
// WebKit, and thus each browser on iOS, also keeps a module file that failed
// to load, for the life of the tab. A reload, or a different page in the same
// tab, uses the failed copy again and sends no request. This occurs for each
// failure: a 404, a response that is not a script, or a connection that drops, such as a
// request in a deploy or on a bad network. A request with `cache: 'reload'`
// replaces the kept copy. Thus the recovery fetches the module files of the
// page again with that mode before the page reloads.

import { InlineScript } from '../../primitives/inline-script/inline-script.tsx'
import { noop } from '../../utilities/noop.ts'

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

/** The elements of the module files of the page: the module scripts, and the module preloads that the HTML and the later loads add. */
const MODULES = 'script[type=module][src],link[rel=modulepreload]'

/** The longest time, in ms, that the head script waits for the new fetches before it reloads. */
const REFETCH_LIMIT = 5000

// The head script. Until the client entry runs, a script or a module preload
// that fails, or a promise that rejects with no handler, reloads the page one
// time. The import of the entry is a promise of the module script. A failed
// load is an `error` event on its element, which does not bubble, so the
// listener captures it on the window. The error of a script that runs has the
// window as its target, so it does not match. The first failure ends the
// watch. The script fetches each module file of the page again (as
// `refetchModules` does), and it reloads when the fetches end or after
// `REFETCH_LIMIT` ms. The fetches also occur when the guard stops the reload,
// so the next reload of the reader gets good copies.
const SCRIPT = `(function(){var w=window;function f(e){var t=e.target;if(e.type==='error'&&!(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK'&&t.rel==='modulepreload')))return;s();var g=false,n=0;try{g=Date.now()-Number(sessionStorage.getItem(${JSON.stringify(RELOADED)}))>=${GUARD};if(g)sessionStorage.setItem(${JSON.stringify(RELOADED)},String(Date.now()))}catch(x){g=false}function r(){if(g&&!n++)location.reload()}setTimeout(r,${REFETCH_LIMIT});Promise.all([].map.call(document.querySelectorAll(${JSON.stringify(MODULES)}),function(l){return fetch(l.src||l.href,{cache:'reload'}).catch(function(){})})).then(r)}
function s(){w.removeEventListener('error',f,true);w.removeEventListener('unhandledrejection',f);delete w.__staleBuild}
w.addEventListener('error',f,true);w.addEventListener('unhandledrejection',f);w.__staleBuild=s})()`

/** The head script that reloads a page whose scripts fail before the client entry runs. Render it in the `<head>`, before the scripts. */
export function StaleBuildScript() {
	return <InlineScript source={SCRIPT} />
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
 * deploy removed gets status 404. A failed request, or any other status,
 * gives `false`, so a bad network does not reload the page.
 */
async function isStale(): Promise<boolean> {
	const url = window.__reactRouterManifest?.url

	if (!url) return false

	try {
		const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })

		return response.status === 404
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

// After the client entry runs, a chunk that fails to load does not reload the
// page (`entry.client.tsx`). But in WebKit, the reload that the reader does
// next, or the reload of a page error, uses the failed copy again. Thus each
// failure fetches the module files of the page again at once, so the next
// load gets good copies. The helper of Vite that loads each chunk sends
// `vite:preloadError` when the load fails.

/** The module files that this page fetched again, so a second failure does not fetch them again. */
const refetched = new Set<string>()

/**
 * Fetches each module file of the page again with `cache: 'reload'`, which
 * replaces the copy that the browser keeps. It skips a file that this page
 * fetched again before. A failed fetch gives no error.
 */
async function refetchModules(): Promise<void> {
	const urls = Array.from(
		document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(MODULES),
		(element) => ('src' in element ? element.src : element.href),
	).filter((url) => !refetched.has(url))

	for (const url of urls) refetched.add(url)

	await Promise.all(urls.map((url) => fetch(url, { cache: 'reload' }).catch(noop)))
}

/**
 * Fetches the module files of the page again each time that the load of a
 * chunk fails, so that a reload of the page in WebKit loads the chunk. The
 * client entry calls it after {@link endStaleBuildWatch}.
 */
export function watchFailedLoads(): void {
	window.addEventListener('vite:preloadError', () => void refetchModules())
}
