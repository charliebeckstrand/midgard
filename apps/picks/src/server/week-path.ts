/** The route context of a path that names a season and a week, such as `/api/predictions/2026/5`. */
export type WeekPathContext = { params: Promise<{ season: string; week: string }> }

/** The season and the week of the path, or `null` for a path that names no week. */
export async function readWeekPath({
	params,
}: WeekPathContext): Promise<{ season: number; week: number } | null> {
	const { season, week } = await params

	const year = Number(season)

	const number = Number(week)

	return Number.isInteger(year) && Number.isInteger(number) && number >= 1
		? { season: year, week: number }
		: null
}
