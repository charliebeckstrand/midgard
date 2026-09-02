/**
 * Selector for the descendants in the tab order: links with an `href`, enabled
 * form controls, and any element whose `tabindex` is not `-1`.
 */
export const FOCUSABLE_SELECTOR =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
