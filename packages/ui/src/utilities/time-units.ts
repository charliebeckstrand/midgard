/**
 * Time units in milliseconds, from a second to a year. `MONTH` and `YEAR` use
 * 30-day and 365-day approximations, so use them only to choose a unit or a
 * step. A calendar step goes through `@internationalized/date`.
 *
 * @internal
 */
export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY
export const MONTH = 30 * DAY
export const YEAR = 365 * DAY

/**
 * The longest delay that the platform timer holds: a 32-bit signed count of
 * milliseconds. The platform wraps a longer delay to 32 bits, and changes
 * `Infinity` to 0, so the timer fires early, often at once.
 *
 * @internal
 */
export const MAX_TIMEOUT = 2 ** 31 - 1
