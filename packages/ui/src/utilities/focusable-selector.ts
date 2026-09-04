/**
 * Selector for the descendants in the tab order: links with an `href`, enabled
 * form controls, and any element whose `tabindex` is not `-1`.
 *
 * @remarks Reads the `disabled` attribute, not the `:disabled` pseudo-class, so
 * a control disabled only through an ancestor `<fieldset disabled>` still
 * matches. `date-picker/use-date-picker-input-tab.ts` wants the inherited state
 * and spells its own selector with `:disabled` for that reason.
 */
export const FOCUSABLE_SELECTOR =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
