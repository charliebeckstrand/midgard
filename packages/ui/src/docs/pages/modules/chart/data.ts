import type { ChartLegendPlacement } from 'ui/chart'

export type Month = { month: string; revenue: number; costs: number; margin: number }

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

export const sources: { source: string; visits: number }[] = [
	{ source: 'Search', visits: 4820 },
	{ source: 'Direct', visits: 2210 },
	{ source: 'Referral', visits: 1370 },
	{ source: 'Social', visits: 940 },
]

export const legendPlacements: { value: ChartLegendPlacement; label: string }[] = [
	{ value: 'right', label: 'Right' },
	{ value: 'left', label: 'Left' },
	{ value: 'top', label: 'Top' },
	{ value: 'bottom', label: 'Bottom' },
]

// Shipments are in the thousands and exceptions are in the tens, so each
// measure has its own axis.
export const operations: { week: string; shipments: number; exceptions: number }[] = [
	{ week: 'W1', shipments: 1240, exceptions: 18 },
	{ week: 'W2', shipments: 1385, exceptions: 9 },
	{ week: 'W3', shipments: 1512, exceptions: 24 },
	{ week: 'W4', shipments: 1467, exceptions: 12 },
	{ week: 'W5', shipments: 1690, exceptions: 31 },
	{ week: 'W6', shipments: 1755, exceptions: 15 },
	{ week: 'W7', shipments: 1621, exceptions: 11 },
	{ week: 'W8', shipments: 1834, exceptions: 22 },
]

export type Stop = { distance: number; dwell: number; handling: number; weight: number }

export const stops: Stop[] = Array.from({ length: 16 }, (_, index) => {
	const distance = 8 + index * 6 + Math.round(10 * Math.sin(index * 2.1))

	return {
		distance,
		dwell: 14 + Math.round(distance / 4 + 9 * Math.sin(index * 1.3)),
		handling: 8 + Math.round(distance / 6 + 7 * Math.cos(index * 1.7)),
		weight: 2 + ((index * 5) % 17),
	}
})

export type FreightMonth = { month: string; rate: number; weight: number }

export const freight: FreightMonth[] = [
	{ month: 'Jan', rate: 1.42, weight: 380 },
	{ month: 'Feb', rate: 1.51, weight: 415 },
	{ month: 'Mar', rate: 1.38, weight: 462 },
	{ month: 'Apr', rate: 1.66, weight: 448 },
	{ month: 'May', rate: 1.72, weight: 530 },
	{ month: 'Jun', rate: 1.58, weight: 585 },
]

export const signups: { day: string; count: number }[] = [
	{ day: '2026-03-02', count: 32 },
	{ day: '2026-03-03', count: 41 },
	{ day: '2026-03-04', count: 38 },
	{ day: '2026-03-05', count: 55 },
	{ day: '2026-03-06', count: 61 },
	{ day: '2026-03-07', count: 48 },
	{ day: '2026-03-08', count: 44 },
	{ day: '2026-03-09', count: 67 },
	{ day: '2026-03-10', count: 72 },
	{ day: '2026-03-11', count: 65 },
	{ day: '2026-03-12', count: 81 },
]

export const dailyVisits: { date: string; visits: number }[] = Array.from(
	{ length: 118 },
	(_, index) => {
		const date = new Date(2026, 0, 1 + index)

		const month = String(date.getMonth() + 1).padStart(2, '0')

		const day = String(date.getDate()).padStart(2, '0')

		const weekend = date.getDay() === 0 || date.getDay() === 6 ? -260 : 0

		return {
			date: `${date.getFullYear()}-${month}-${day}`,
			visits: 1200 + index * 6 + weekend + Math.round(180 * Math.sin(index / 9)),
		}
	},
)

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const HOURS = ['00', '03', '06', '09', '12', '15', '18', '21'] as const

const WEIGHT_BY_HOUR: Record<(typeof HOURS)[number], number> = {
	'00': 1,
	'03': 0,
	'06': 2,
	'09': 9,
	'12': 6,
	'15': 8,
	'18': 4,
	'21': 2,
}

export const activity: { day: string; hour: string; commits: number }[] = DAYS.flatMap(
	(day, dayIndex) => {
		const weekend = dayIndex >= 5 ? 0.25 : 1

		return HOURS.map((hour, hourIndex) => {
			const base = WEIGHT_BY_HOUR[hour] * weekend

			const ripple = Math.round(base * (1 + 0.35 * Math.sin(dayIndex + hourIndex)))

			return { day, hour, commits: Math.max(0, ripple) }
		})
	},
)

export const greens: string[] = [
	'oklch(0.982 0.018 155.826)',
	'oklch(0.962 0.044 156.743)',
	'oklch(0.925 0.084 155.995)',
	'oklch(0.871 0.15 154.449)',
	'oklch(0.792 0.209 151.711)',
	'oklch(0.723 0.219 149.579)',
	'oklch(0.627 0.194 149.214)',
	'oklch(0.527 0.154 150.069)',
	'oklch(0.448 0.119 151.328)',
	'oklch(0.393 0.095 152.535)',
	'oklch(0.266 0.065 152.934)',
]

export const heat: string[] = [
	'oklch(0.987 0.022 95.277)',
	'oklch(0.962 0.059 95.617)',
	'oklch(0.924 0.12 95.746)',
	'oklch(0.879 0.169 91.605)',
	'oklch(0.828 0.189 84.429)',
	'oklch(0.769 0.188 70.08)',
	'oklch(0.666 0.179 58.318)',
	'oklch(0.555 0.163 48.998)',
	'oklch(0.473 0.137 46.201)',
	'oklch(0.414 0.112 45.904)',
	'oklch(0.279 0.077 45.635)',
]

// The estimated resident population of each state in millions.
// The name of a state joins the row to its shape in the atlas.
export const statePopulation: { state: string; people: number }[] = [
	{ state: 'California', people: 39.4 },
	{ state: 'Texas', people: 31.7 },
	{ state: 'Florida', people: 23.5 },
	{ state: 'New York', people: 20.0 },
	{ state: 'Pennsylvania', people: 13.1 },
	{ state: 'Illinois', people: 12.7 },
	{ state: 'Ohio', people: 11.9 },
	{ state: 'Georgia', people: 11.3 },
	{ state: 'North Carolina', people: 11.2 },
	{ state: 'Michigan', people: 10.1 },
	{ state: 'New Jersey', people: 9.5 },
	{ state: 'Virginia', people: 8.9 },
	{ state: 'Washington', people: 8.0 },
	{ state: 'Arizona', people: 7.6 },
	{ state: 'Tennessee', people: 7.3 },
	{ state: 'Massachusetts', people: 7.2 },
	{ state: 'Indiana', people: 7.0 },
	{ state: 'Missouri', people: 6.3 },
	{ state: 'Maryland', people: 6.3 },
	{ state: 'Colorado', people: 6.0 },
	{ state: 'Wisconsin', people: 6.0 },
	{ state: 'Minnesota', people: 5.8 },
	{ state: 'South Carolina', people: 5.6 },
	{ state: 'Alabama', people: 5.2 },
	{ state: 'Louisiana', people: 4.6 },
	{ state: 'Kentucky', people: 4.6 },
	{ state: 'Oregon', people: 4.3 },
	{ state: 'Oklahoma', people: 4.1 },
	{ state: 'Connecticut', people: 3.7 },
	{ state: 'Utah', people: 3.5 },
	{ state: 'Nevada', people: 3.3 },
	{ state: 'Iowa', people: 3.2 },
	{ state: 'Arkansas', people: 3.1 },
	{ state: 'Kansas', people: 3.0 },
	{ state: 'Mississippi', people: 3.0 },
	{ state: 'New Mexico', people: 2.1 },
	{ state: 'Idaho', people: 2.0 },
	{ state: 'Nebraska', people: 2.0 },
	{ state: 'West Virginia', people: 1.8 },
	{ state: 'Hawaii', people: 1.4 },
	{ state: 'New Hampshire', people: 1.4 },
	{ state: 'Maine', people: 1.4 },
	{ state: 'Montana', people: 1.1 },
	{ state: 'Rhode Island', people: 1.1 },
	{ state: 'Delaware', people: 1.1 },
	{ state: 'South Dakota', people: 0.9 },
	{ state: 'North Dakota', people: 0.8 },
	{ state: 'Alaska', people: 0.7 },
	{ state: 'District of Columbia', people: 0.7 },
	{ state: 'Vermont', people: 0.6 },
	{ state: 'Wyoming', people: 0.6 },
]
