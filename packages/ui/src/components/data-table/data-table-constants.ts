export const DEFAULT_ROW_HEIGHT = 44
export const DEFAULT_OVERSCAN = 10

// Stable empty-set default so an omitted `hidden`/`defaultHidden` doesn't allocate a
// fresh Set per render and bust referential checks. Read-only; toggles copy it.
export const EMPTY_SET: Set<string | number> = new Set()
