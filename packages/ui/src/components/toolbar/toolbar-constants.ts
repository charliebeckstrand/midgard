export const TOOLBAR_ITEM_SELECTOR = [
	'a[href]',
	'button:not(:disabled)',
	// Both roving-tabindex states: a custom item starts at `0` and the roving
	// model demotes it to `-1`. The query includes both; demoted items remain
	// reachable.
	'[tabindex="0"]',
	'[tabindex="-1"]',
	'[role="button"]:not([aria-disabled="true"])',
	'[role="checkbox"]:not([aria-disabled="true"])',
	'[role="radio"]:not([aria-disabled="true"])',
].join(',')
