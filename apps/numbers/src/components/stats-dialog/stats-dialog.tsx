'use client'

import type { User } from 'auth'
import { BarChart } from 'ui/chart'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from 'ui/dialog'
import { useIntl } from 'ui/primitives/intl'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stat, StatLabel, StatValue, StatValueSkeleton } from 'ui/stat'
import { Columns } from 'ui/structure/columns'
import { Stack } from 'ui/structure/stack'
import { TabContent, TabContents } from 'ui/tabs'
import { Text } from 'ui/text'
import type { Mode, ModeStats } from '../../api/stats-api'
import { useStats } from '../../queries/stats-queries'
import { ROUTE_LABELS } from '../../utilities/seed'

/** Props for {@link StatsDialog}. */
export type StatsDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The signed-in user. The menu shows Stats only to a signed-in reader. */
	user: User
}

/** One tile: its label, and its value, or none while the stats load. */
type Tile = [label: string, value: string | undefined]

/**
 * The tiles of the stats of `mode`, from {@link ModeStats}, or skeletons while
 * they load. Vs CPU also shows Win %, the share of the runs that beat the CPU,
 * which is empty until the first run that counts toward it.
 */
function ModeTiles({ mode, stats }: { mode: Mode; stats: ModeStats | undefined }) {
	const intl = useIntl()

	const decimal = (value: number) => intl.formatNumber(value, { maximumFractionDigits: 1 })

	const percent = (value: number | null) =>
		value === null ? '–' : intl.formatNumber(value, { style: 'percent', maximumFractionDigits: 0 })

	const ofMode: Tile[] = mode === 'vsCpu' ? [['Win %', stats && percent(stats.winRate)]] : []

	const tiles: Tile[] = [
		['Played', stats && intl.formatNumber(stats.played)],
		['Best', stats && (stats.best === null ? '–' : intl.formatNumber(stats.best))],
		['Average', stats && (stats.average === null ? '–' : decimal(stats.average))],
		...ofMode,
	]

	return (
		<Stack gap="lg">
			<Columns columns={3} gap="md">
				{tiles.map(([label, value]) => (
					<Stat key={label}>
						<StatLabel>{label}</StatLabel>

						{value === undefined ? <StatValueSkeleton /> : <StatValue>{value}</StatValue>}
					</Stat>
				))}
			</Columns>

			{/* The first number always has an empty slot, so no run scores 0. */}
			{stats && stats.played > 0 ? (
				<BarChart
					aria-label="Runs by score"
					data={stats.scores.slice(1).map((runs, index) => ({ score: String(index + 1), runs }))}
					series={[{ xKey: 'score', yKey: 'runs', yName: 'Runs' }]}
					axes={{ y: { integer: true } }}
				/>
			) : null}
		</Stack>
	)
}

/** The stats of a signed-in reader with a verified email, by mode. */
function SignedInStats() {
	const { data, isError } = useStats(true)

	if (isError) return <Text>The stats could not be loaded. Try again later.</Text>

	return (
		<Segment defaultValue="solo">
			<Stack gap="lg">
				<SegmentControl aria-label="Mode">
					<SegmentItem value="solo">{ROUTE_LABELS.solo}</SegmentItem>
					<SegmentItem value="vsCpu">Vs CPU</SegmentItem>
				</SegmentControl>

				<TabContents animate="slide">
					<TabContent value="solo">
						<ModeTiles mode="solo" stats={data?.solo} />
					</TabContent>

					<TabContent value="vsCpu">
						<ModeTiles mode="vsCpu" stats={data?.vsCpu} />
					</TabContent>
				</TabContents>
			</Stack>
		</Segment>
	)
}

/** What the dialog shows: the stats, or why the reader has none. */
function StatsContent({ user }: { user: User }) {
	if (!user.is_verified) {
		return <Text>Verify your email to keep the stats of your runs. The menu sends the link.</Text>
	}

	return <SignedInStats />
}

/**
 * The stats of a signed-in reader, from the Stats item of the header menu. A
 * reader with no verified email gets a line that asks for the verification,
 * and the dialog sends no request for the stats.
 */
export function StatsDialog({ open, onOpenChange, user }: StatsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel width="sm">
				<DialogHeader>
					<DialogTitle>Stats</DialogTitle>
				</DialogHeader>

				<DialogBody>
					<StatsContent user={user} />
				</DialogBody>
			</DialogPanel>
		</Dialog>
	)
}
