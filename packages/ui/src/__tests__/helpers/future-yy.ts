/**
 * The two-digit year two years after the current year. A card expiry in a month
 * of that year is in the future on each day that the suite runs.
 */
export const futureYY = String((new Date().getFullYear() + 2) % 100).padStart(2, '0')
