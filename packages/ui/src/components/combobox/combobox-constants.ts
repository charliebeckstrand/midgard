/**
 * Selector for focusable (non-disabled) options. Shared by the roving hook,
 * virtual-active re-anchoring, and the sole-option Enter shortcut so every path
 * skips disabled rows identically.
 *
 * @internal
 */
export const OPTION_SELECTOR = '[role="option"]:not([data-disabled])'
