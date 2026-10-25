import type { ChartLegendPlacement } from 'ui/chart'
import { dayNames, monthNames } from '../../../data/calendar.ts'
import { words } from '../../../data/words.ts'

export type Month = { month: string; revenue: number; costs: number; margin: number }

export const months: Month[] = [
	{ month: monthNames.jan, revenue: 42, costs: 28, margin: 14 },
	{ month: monthNames.feb, revenue: 51, costs: 30, margin: 21 },
	{ month: monthNames.mar, revenue: 47, costs: 33, margin: 14 },
	{ month: monthNames.apr, revenue: 63, costs: 35, margin: 28 },
	{ month: monthNames.may, revenue: 58, costs: 34, margin: 24 },
	{ month: monthNames.jun, revenue: 71, costs: 38, margin: 33 },
]

export const swings: { month: string; delta: number }[] = [
	{ month: monthNames.jan, delta: 12 },
	{ month: monthNames.feb, delta: -6 },
	{ month: monthNames.mar, delta: 9 },
	{ month: monthNames.apr, delta: -14 },
	{ month: monthNames.may, delta: 18 },
	{ month: monthNames.jun, delta: 7 },
]

// The sources of the visits to a site. A row holds the word, because a pie
// or a donut reads it as the name of a slice.
const sourceNames = words('traffic-source', {
	search: 'Search',
	direct: 'Direct',
	referral: 'Referral',
	social: 'Social',
})

export const sources: { source: string; visits: number }[] = [
	{ source: sourceNames.search, visits: 4820 },
	{ source: sourceNames.direct, visits: 2210 },
	{ source: sourceNames.referral, visits: 1370 },
	{ source: sourceNames.social, visits: 940 },
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

/** The freight rate in dollars a pound, and the weight in pounds. */
export type FreightMonth = { month: string; rate: number; weight: number }

export const freight: FreightMonth[] = [
	{ month: monthNames.jan, rate: 1.42, weight: 380_000 },
	{ month: monthNames.feb, rate: 1.51, weight: 415_000 },
	{ month: monthNames.mar, rate: 1.38, weight: 462_000 },
	{ month: monthNames.apr, rate: 1.66, weight: 448_000 },
	{ month: monthNames.may, rate: 1.72, weight: 530_000 },
	{ month: monthNames.jun, rate: 1.58, weight: 585_000 },
]

const signupCounts = [32, 41, 38, 55, 61, 48, 44, 67, 72, 65, 81]

export const signups: { day: Date; count: number }[] = signupCounts.map((count, index) => ({
	day: new Date(2026, 2, 2 + index),
	count,
}))

export const dailyVisits: { date: Date; visits: number }[] = Array.from(
	{ length: 118 },
	(_, index) => {
		const date = new Date(2026, 0, 1 + index)

		const weekend = date.getDay() === 0 || date.getDay() === 6 ? -260 : 0

		return {
			date,
			visits: 1200 + index * 6 + weekend + Math.round(180 * Math.sin(index / 9)),
		}
	},
)

const DAYS = Object.values(dayNames)

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

export const activity: { day: string; hour: string; orders: number }[] = DAYS.flatMap(
	(day, dayIndex) => {
		const weekend = dayIndex >= 5 ? 0.25 : 1

		return HOURS.map((hour, hourIndex) => {
			const base = WEIGHT_BY_HOUR[hour] * weekend

			const ripple = Math.round(base * (1 + 0.35 * Math.sin(dayIndex + hourIndex)))

			return { day, hour, orders: Math.max(0, ripple) }
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

// The number of customers in each state.
// The name of a state joins the row to its shape in the atlas.
export const customersByState: { state: string; customers: number }[] = [
	{ state: 'California', customers: 39_400 },
	{ state: 'Texas', customers: 31_700 },
	{ state: 'Florida', customers: 23_500 },
	{ state: 'New York', customers: 20_000 },
	{ state: 'Pennsylvania', customers: 13_100 },
	{ state: 'Illinois', customers: 12_700 },
	{ state: 'Ohio', customers: 11_900 },
	{ state: 'Georgia', customers: 11_300 },
	{ state: 'North Carolina', customers: 11_200 },
	{ state: 'Michigan', customers: 10_100 },
	{ state: 'New Jersey', customers: 9_500 },
	{ state: 'Virginia', customers: 8_900 },
	{ state: 'Washington', customers: 8_000 },
	{ state: 'Arizona', customers: 7_600 },
	{ state: 'Tennessee', customers: 7_300 },
	{ state: 'Massachusetts', customers: 7_200 },
	{ state: 'Indiana', customers: 7_000 },
	{ state: 'Missouri', customers: 6_300 },
	{ state: 'Maryland', customers: 6_300 },
	{ state: 'Colorado', customers: 6_000 },
	{ state: 'Wisconsin', customers: 6_000 },
	{ state: 'Minnesota', customers: 5_800 },
	{ state: 'South Carolina', customers: 5_600 },
	{ state: 'Alabama', customers: 5_200 },
	{ state: 'Louisiana', customers: 4_600 },
	{ state: 'Kentucky', customers: 4_600 },
	{ state: 'Oregon', customers: 4_300 },
	{ state: 'Oklahoma', customers: 4_100 },
	{ state: 'Connecticut', customers: 3_700 },
	{ state: 'Utah', customers: 3_500 },
	{ state: 'Nevada', customers: 3_300 },
	{ state: 'Iowa', customers: 3_200 },
	{ state: 'Arkansas', customers: 3_100 },
	{ state: 'Kansas', customers: 3_000 },
	{ state: 'Mississippi', customers: 3_000 },
	{ state: 'New Mexico', customers: 2_100 },
	{ state: 'Idaho', customers: 2_000 },
	{ state: 'Nebraska', customers: 2_000 },
	{ state: 'West Virginia', customers: 1_800 },
	{ state: 'Hawaii', customers: 1_400 },
	{ state: 'New Hampshire', customers: 1_400 },
	{ state: 'Maine', customers: 1_400 },
	{ state: 'Montana', customers: 1_100 },
	{ state: 'Rhode Island', customers: 1_100 },
	{ state: 'Delaware', customers: 1_100 },
	{ state: 'South Dakota', customers: 900 },
	{ state: 'North Dakota', customers: 800 },
	{ state: 'Alaska', customers: 700 },
	{ state: 'District of Columbia', customers: 700 },
	{ state: 'Vermont', customers: 600 },
	{ state: 'Wyoming', customers: 600 },
]
