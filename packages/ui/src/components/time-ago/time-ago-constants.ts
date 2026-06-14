/**
 * Duration constants in milliseconds, from second to year, shared by
 * {@link TimeAgo}'s unit-bucketing and adaptive-refresh logic. `MONTH` and
 * `YEAR` use 30- and 365-day approximations.
 * @internal
 */
export const SEC = 1000
export const MIN = 60 * SEC
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY
export const MONTH = 30 * DAY
export const YEAR = 365 * DAY
