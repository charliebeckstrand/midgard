import { DEBUG_ATTRIBUTE, DEBUG_KEY } from './store'

// Reads the stored list of the tools that are on, as `useDebugTools` does, and
// writes it on the root element. Storage access can throw, and the value can be
// bad JSON. All tools are then off.
const SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(DEBUG_KEY)})||'[]');if(Array.isArray(t)&&t.length)document.documentElement.setAttribute(${JSON.stringify(DEBUG_ATTRIBUTE)},t.join(' '))}catch(e){}})()`

/**
 * Inline script that marks the root element with the debug tools that are on
 * ({@link DEBUG_ATTRIBUTE}), before the first paint. CSS then shows the header
 * button of each of these tools in the prerendered page, and the page does not
 * wait for the code of a tool. Render it in the document `<head>`.
 */
export function DebugScript() {
	// biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script with no user input.
	return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
