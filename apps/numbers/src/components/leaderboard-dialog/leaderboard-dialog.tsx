'use client'

import type { User } from 'auth'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { DateTime } from 'ui/date-time'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from 'ui/dialog'
import { useToday } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { useIntl } from 'ui/primitives/intl'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import {
	Table,
	TableBody,
	TableCell,
	TableEmpty,
	TableHead,
	TableHeader,
	TableLoading,
	TableRow,
} from 'ui/table'
import { TabContent, TabContents } from 'ui/tabs'
import { Text } from 'ui/text'
import type { BoardEntry } from '../../api/leaderboard-api'
import type { Mode } from '../../api/stats-api'
import { useBoard } from '../../queries/leaderboard-queries'
import { dailySeed } from '../../utilities/seed'

/** Props for {@link LeaderboardDialog}. */
export type LeaderboardDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The signed-in user. The menu shows Leaderboard only to a signed-in reader. */
	user: User
}

/** The local midnight `days` days after `date`. */
function addDays(date: Date, days: number): Date {
	const next = new Date(date)

	next.setDate(next.getDate() + days)

	return next
}

/** One row of a board. The row of the reader shows a badge. */
function BoardRow({ entry }: { entry: BoardEntry }) {
	const intl = useIntl()

	return (
		<TableRow aria-current={entry.you || undefined}>
			<TableCell className="tabular-nums">{intl.formatNumber(entry.rank)}</TableCell>

			<TableCell>
				<Flex align="center" gap="sm">
					{entry.name === null ? (
						<Text as="span" tone="muted">
							Anonymous
						</Text>
					) : (
						<Text as="span">{entry.name}</Text>
					)}

					{entry.you ? <Badge color="blue">You</Badge> : null}
				</Flex>
			</TableCell>

			<TableCell className="text-end tabular-nums">{intl.formatNumber(entry.score)} / 20</TableCell>
		</TableRow>
	)
}

/**
 * The board of the daily puzzle of `date` in `mode`: the top 10 by the score of
 * their first run, then the reader when they are below them, and the count of
 * players.
 */
function Board({ date, mode }: { date: string; mode: Mode }) {
	const intl = useIntl()

	const { data, isError } = useBoard(date, mode, true)

	if (isError) return <Text>The leaderboard could not be loaded. Try again later.</Text>

	return (
		<Stack gap="sm">
			<Table>
				<TableHead>
					<TableRow>
						{/* Fixed widths for the numbers, so the columns hold still from day to day. */}
						<TableHeader className="w-16">Rank</TableHeader>
						<TableHeader>Player</TableHeader>
						<TableHeader className="w-24 text-end">Score</TableHeader>
					</TableRow>
				</TableHead>

				{data === undefined ? (
					<TableLoading columns={3} rows={3} />
				) : data.entries.length === 0 ? (
					<TableEmpty columns={3}>No one has played this puzzle yet.</TableEmpty>
				) : (
					<TableBody>
						{/* A row is its place on the board, and players have no id here. */}
						{data.entries.map((entry, index) => (
							<BoardRow key={index} entry={entry} />
						))}
					</TableBody>
				)}
			</Table>

			{data && data.players > 0 ? (
				<Text tone="muted" size="sm">
					{data.players === 1 ? '1 player' : `${intl.formatNumber(data.players)} players`}
				</Text>
			) : null}
		</Stack>
	)
}

/**
 * The line under the boards about how the reader shows on them. Only the runs
 * of a verified user count, and a user shows by the name of their account.
 */
function ReaderNote({ user }: { user: User }) {
	if (!user.is_verified) {
		return <Text>Verify your email to be on the leaderboard. The menu sends the link.</Text>
	}

	if (user.name === null) {
		return (
			<Text tone="muted" size="sm">
				Your account has no name, so the leaderboard shows you as Anonymous.
			</Text>
		)
	}

	return null
}

/**
 * The boards of a signed-in reader, by mode, on the daily puzzle of a day that
 * the arrows move. The board opens on today, and goes back to earlier days, but
 * not past today.
 */
function SignedInBoards({ user }: { user: User }) {
	const today = useToday()

	const [back, setBack] = useState(0)

	if (!today) return null

	const day = addDays(today, -back)

	const date = dailySeed(day)

	return (
		<Stack gap="lg">
			<Segment defaultValue="solo">
				<Stack gap="lg">
					<SegmentControl aria-label="Mode">
						<SegmentItem value="solo">Solo</SegmentItem>
						<SegmentItem value="vsCpu">Vs CPU</SegmentItem>
					</SegmentControl>

					<Flex align="center" justify="between" gap="sm">
						<Button variant="plain" aria-label="Earlier day" onClick={() => setBack(back + 1)}>
							<Icon icon={<ChevronLeft />} />
						</Button>

						<Text as="span" aria-live="polite">
							{back === 0 ? 'Today' : <DateTime value={day} format={{ dateStyle: 'medium' }} />}
						</Text>

						<Button
							variant="plain"
							aria-label="Later day"
							disabled={back === 0}
							onClick={() => setBack(back - 1)}
						>
							<Icon icon={<ChevronRight />} />
						</Button>
					</Flex>

					<TabContents>
						<TabContent value="solo">
							<Board date={date} mode="solo" />
						</TabContent>

						<TabContent value="vsCpu">
							<Board date={date} mode="vsCpu" />
						</TabContent>
					</TabContents>
				</Stack>
			</Segment>

			<ReaderNote user={user} />
		</Stack>
	)
}

/**
 * The leaderboard of each daily puzzle, from the Leaderboard item of the header
 * menu. Each player is ranked by the first run of the puzzle, and shows by the
 * name of their account, or as anonymous when it has none. A reader with no
 * verified email sees the boards, and a line that asks for the verification.
 */
export function LeaderboardDialog({ open, onOpenChange, user }: LeaderboardDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel width="sm">
				<DialogHeader>
					<DialogTitle>Leaderboard</DialogTitle>
				</DialogHeader>

				<DialogBody>
					<SignedInBoards user={user} />
				</DialogBody>
			</DialogPanel>
		</Dialog>
	)
}
