/**
 * The base touch style of the page. `ui/tailwind.css` loads this plugin with
 * `@plugin`.
 *
 * The plugin sets `touch-action: manipulation` on the root element. On iOS,
 * WebKit can join two quick taps into one double-click. It sends that
 * double-click to the point of the first tap, and the second tap gets no
 * click. WebKit does this only when an element that listens for `dblclick` is
 * at the point of the tap, and only when that element and each of its
 * ancestors have `touch-action: auto` (`Element::allowsDoubleTapGesture`).
 * React listens for `dblclick` on the container of the app, so each tap on the
 * page meets the first condition. Thus a quick tap on a control next to the
 * control of the tap before, such as the next Radio of a group, clicks the
 * first control again. A component cannot stop this, because the listener is
 * on the container. The root style is an ancestor of each container, so it
 * stops it on each page that uses ui.
 *
 * `manipulation` keeps pan and pinch zoom. It stops the double-tap zoom, and on
 * iOS it stops a double-tap from sending `dblclick`.
 */

import type { PluginCreator } from 'tailwindcss/plugin'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addBase }) => {
	addBase({ ':root': { 'touch-action': 'manipulation' } })
}
