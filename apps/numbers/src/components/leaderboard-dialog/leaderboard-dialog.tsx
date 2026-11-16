'use client'

import type { User } from 'auth'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { DateTime } from 'ui/date-time'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from 'ui/dialog'
import { useToday } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Link } from 'ui/link'
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
import type { BoardEntry, BoardMode } from '../../api/leaderboard-api'
import { useBoard, usePrefetchBoards } from '../../queries/leaderboard-queries'
import { SLOTS } from '../../utilities/game'
import { dailySeed } from '../../utilities/seed'

/** Props for {@link LeaderboardDialog}. */
export type LeaderboardDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The signed-in user, or none. The boards are the same for each reader. */
	user?: User
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

			<TableCell className="text-end tabular-nums">{`${intl.formatNumber(entry.score)} / ${SLOTS}`}</TableCell>
		</TableRow>
	)
}

/**
 * The board `mode` of the day `date`: the top 10 by their best score on it,
 * then the reader when they are below them, and the count of players.
 */
function Board({ date, mode }: { date: string; mode: BoardMode }) {
	const intl = useIntl()

	const { data, isError, isPlaceholderData } = useBoard(date, mode)

	if (isError) return <Text>The leaderboard could not be loaded. Try again later.</Text>

	return (
		<Stack gap="sm">
			{/* Until the rows of a new day arrive, the rows of the last day stay, dimmed. */}
			<Table
				aria-busy={isPlaceholderData || undefined}
				className={isPlaceholderData ? 'opacity-50 transition-opacity' : 'transition-opacity'}
			>
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
					<TableEmpty columns={3}>No one is on this board yet.</TableEmpty>
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
 * of a signed-in user with a verified email count, and a user shows by the name
 * of their account.
 */
function ReaderNote({ user }: { user?: User }) {
	if (!user) {
		return (
			<Text>
				<Link href="/login" underline>
					Sign in
				</Link>{' '}
				to be on the leaderboard.
			</Text>
		)
	}

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
 * The boards of a day that the arrows move, in the order of the menu: Solo for
 * the solo runs of other seeds, Daily for the daily puzzle, and Vs CPU for the
 * runs that beat the CPU. The dialog opens on Daily. The boards open on today,
 * and go back to earlier days, but not past today.
 */
function Boards({ user }: { user?: User }) {
	const today = useToday()

	const [back, setBack] = useState(0)

	const day = today ? addDays(today, -back) : null

	const date = day ? dailySeed(day) : null

	const prefetchBoards = usePrefetchBoards()

	// The tab that shows reads its own board. This reads the other two, so a
	// switch of tab slides to a board that has its rows.
	useEffect(() => {
		if (date) prefetchBoards(date)
	}, [date, prefetchBoards])

	if (!day || !date) return null

	return (
		<Stack gap="lg">
			<Segment defaultValue="daily">
				<Stack gap="lg">
					<SegmentControl aria-label="Board">
						<SegmentItem value="solo">Solo</SegmentItem>
						<SegmentItem value="daily">Daily</SegmentItem>
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

					<TabContents animate="slide">
						<TabContent value="solo">
							<Board date={date} mode="solo" />
						</TabContent>

						<TabContent value="daily">
							<Board date={date} mode="daily" />
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
 * The leaderboards of each day, from the Leaderboard item of the header menu.
 * Each player is ranked by their best score on a board, and shows by the
 * name of their account, or as anonymous when it has none. Each reader sees the
 * boards. A reader with no session gets a line that asks them to sign in, and a
 * reader with no verified email gets a line that asks for the verification.
 */
export function LeaderboardDialog({ open, onOpenChange, user }: LeaderboardDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel width="sm">
				<DialogHeader>
					<DialogTitle>Leaderboard</DialogTitle>
				</DialogHeader>

				<DialogBody>
					<Boards user={user} />
				</DialogBody>
			</DialogPanel>
		</Dialog>
	)
}
