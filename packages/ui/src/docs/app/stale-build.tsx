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
