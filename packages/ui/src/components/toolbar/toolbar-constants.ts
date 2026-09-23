// One `:is()` selector, not a comma list. A comma list can match by arm in
// jsdom (nwsapi), which breaks the arrow order. The `:is()` form keeps
// document order in every engine.
export const TOOLBAR_ITEM_SELECTOR = `:is(${[
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
].join(',')})`
