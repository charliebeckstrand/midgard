export const TOOLBAR_ITEM_SELECTOR = [
	'a[href]',
	'button:not(:disabled)',
	// Both roving-tabindex states: a custom item starts at `0` and is demoted
	// to `-1`. Both must be in the query so demoted items remain reachable.
	'[tabindex="0"]',
	'[tabindex="-1"]',
	'[role="button"]:not([aria-disabled="true"])',
	'[role="checkbox"]:not([aria-disabled="true"])',
	'[role="radio"]:not([aria-disabled="true"])',
].join(',')
