export const TOOLBAR_ITEM_SELECTOR = [
	'a[href]',
	'button:not(:disabled)',
	'[tabindex="0"]',
	'[role="button"]:not([aria-disabled="true"])',
	'[role="checkbox"]:not([aria-disabled="true"])',
	'[role="radio"]:not([aria-disabled="true"])',
].join(',')
