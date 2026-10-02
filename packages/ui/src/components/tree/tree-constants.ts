export const ITEM_SELECTOR = '[role="treeitem"]'

/**
 * The items that roving reaches: each treeitem that is not in a closed group.
 * Under `mount="lazy"` or `"always"`, a closed group holds its items at
 * `display: none`, and a hidden item cannot take focus.
 */
export const ROVING_ITEM_SELECTOR = `${ITEM_SELECTOR}:not([data-slot="tree-group"]:not([data-open]) *)`

export const AFFIX_SELECTOR = '[data-slot="tree-item-prefix"], [data-slot="tree-item-suffix"]'

export const PREFIX_INTERACTIVE_SELECTOR =
	'[data-slot="tree-item-prefix"] input, [data-slot="tree-item-prefix"] button, [data-slot="tree-item-prefix"] [role="checkbox"]'
