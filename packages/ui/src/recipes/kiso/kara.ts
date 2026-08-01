/**
 * Kara (空): emptiness.
 *
 * A listbox whose options come from `VirtualOptions` is never CSS `:empty`.
 * The primitive keeps a wrapper mounted at zero items — its scroll-ancestor
 * walk needs the ref — so `:empty` on the listbox can never match and the
 * sibling "no results" message can never appear. The wrapper stamps
 * `data-empty` instead (`primitives/virtual-options`), and these two selectors
 * are how a container reads it: one collapses the list, one reveals the
 * message beside it.
 *
 * Pair them with the plain `:empty` rules rather than replacing them — the
 * non-virtualized path still empties for real.
 *
 * Literal class strings: Tailwind's source scanner can't see selectors built
 * from templates, so each is spelled out in full. A shared literal is scanned
 * like any other, since the docs and admin stylesheets both `@source` this
 * whole tree.
 *
 * Layer: kiso · Concern: virtualized emptiness
 */

export const kara = {
	/** On the options container: collapse it when its virtual wrapper reports empty. */
	list: 'has-[[data-slot=virtual-options][data-empty]]:hidden',
	/** On a sibling of that container, after `peer`: reveal it in the same case. */
	message: 'peer-has-[[data-slot=virtual-options][data-empty]]:block',
} as const
