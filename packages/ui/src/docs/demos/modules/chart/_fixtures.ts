type Month = { month: string; revenue: number; costs: number; margin: number }

export const months: Month[] = [
	{ month: 'Jan', revenue: 42, costs: 28, margin: 14 },
	{ month: 'Feb', revenue: 51, costs: 30, margin: 21 },
	{ month: 'Mar', revenue: 47, costs: 33, margin: 14 },
	{ month: 'Apr', revenue: 63, costs: 35, margin: 28 },
	{ month: 'May', revenue: 58, costs: 34, margin: 24 },
	{ month: 'Jun', revenue: 71, costs: 38, margin: 33 },
]

export const swings: { month: string; delta: number }[] = [
	{ month: 'Jan', delta: 12 },
	{ month: 'Feb', delta: -6 },
	{ month: 'Mar', delta: 9 },
	{ month: 'Apr', delta: -14 },
	{ month: 'May', delta: 18 },
	{ month: 'Jun', delta: 7 },
]

export const sources = [
	{ source: 'Search', visits: 4820 },
	{ source: 'Direct', visits: 2210 },
	{ source: 'Referral', visits: 1370 },
	{ source: 'Social', visits: 940 },
]

type StopRecord = { distance: number; dwell: number; handling: number; weight: number }

// One row per delivery stop — a deterministic spread with a loose upward trend,
// dwell and handling as two measures over the same distances.
export const stops: StopRecord[] = Array.from({ length: 16 }, (_, index) => {
	const distance = 8 + index * 6 + Math.round(10 * Math.sin(index * 2.1))

	return {
		distance,
		dwell: 14 + Math.round(distance / 4 + 9 * Math.sin(index * 1.3)),
		handling: 8 + Math.round(distance / 6 + 7 * Math.cos(index * 1.7)),
		weight: 2 + ((index * 5) % 17),
	}
})
