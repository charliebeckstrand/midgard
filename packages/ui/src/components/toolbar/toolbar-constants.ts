export const TOOLBAR_ITEM_SELECTOR = [
	'a[href]',
	'button:not(:disabled)',
	// Both roving-managed states: a custom item starts at `0` and is demoted to
	// `-1`. Matching only `[tabindex="0"]` dropped demoted items from the query,
	// leaving them orphaned and unreachable by arrow keys.
	'[tabindex="0"]',
	'[tabindex="-1"]',
	'[role="button"]:not([aria-disabled="true"])',
	'[role="checkbox"]:not([aria-disabled="true"])',
	'[role="radio"]:not([aria-disabled="true"])',
].join(',')
