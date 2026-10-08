/**
 * The base style that decides the default footer of a panel root. `ui/tailwind.css`
 * loads this plugin with `@plugin`.
 *
 * Dialog, Sheet, and Drawer render a default footer after their children. It
 * shows only while the panel has no Footer slot of its own. A Footer can be
 * anywhere in the children, for example in a form, so the root cannot see it
 * in a render. A Footer that reports itself from an effect is too late for the
 * server HTML: the default footer then shows until hydration.
 *
 * Thus CSS makes the decision. The default footer is the last child of the
 * panel, so the rule reads its earlier siblings: a Footer slot, or an element
 * that holds one. The browser applies the rule at each paint, also to the server
 * HTML, and a Footer that unmounts brings the default footer back.
 *
 * The rule is `!important` because a base style is in a lower layer than a
 * utility, and the footer row has a `display` utility.
 */

import type { PluginCreator } from 'tailwindcss/plugin'

/**
 * The rule: a default footer after a footer, or after an element that holds one.
 * Each footer of a panel has `data-panel-footer`, and the default footer has the
 * value `default`. The default footer is the last child, so it is never an
 * earlier sibling.
 */
export const defaultFooterSelector =
	":is([data-panel-footer], :has([data-panel-footer])) ~ [data-panel-footer='default']"

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addBase }) => {
	addBase({ [defaultFooterSelector]: { display: 'none !important' } })
}
