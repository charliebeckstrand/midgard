/**
 * The date of `date` in the time zone of the reader, as `YYYYMMDD`, such as
 * `20261115`. Mimir keeps a leaderboard for each day in this form, and a run
 * counts on the board of the date of the reader, so each reader gets a new
 * board at their own midnight.
 */
export function dayKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0')

	return `${date.getFullYear()}${month}${String(date.getDate()).padStart(2, '0')}`
}
