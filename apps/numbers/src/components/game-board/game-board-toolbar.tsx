'use client'

import { RotateCcw } from 'lucide-react'
import { type MouseEvent, type Ref, useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Odometer } from 'ui/odometer'
import { Flex } from 'ui/structure/flex'
import { Text, type TextProps } from 'ui/text'
import { type Game, isEnded, type Status } from '../../utilities/game'

/** The tone of the readout at each step: full while a number waits, red on a bust, and muted else. */
const TONES: Record<Status, TextProps['tone']> = {
	ready: 'muted',
	placing: 'default',
	bust: 'error',
	won: 'muted',
}

/**
 * The readout of the drawn number. The toolbar mounts it again for each run.
 * With `fromZero`, it shows 0 at its mount, and then rolls to `value`. Thus the
 * first number of a new run rolls from 0, also when it is near the last number
 * of the run before. The run of the page has no `fromZero`, so the server
 * render and the first paint show its number, and nothing rolls at a load.
 */
function RunReadout({ value, fromZero }: { value: number; fromZero: boolean }) {
	const [mounted, setMounted] = useState(!fromZero)

	useEffect(() => setMounted(true), [])

	return <Odometer value={mounted ? value : 0} />
}

/** Props for {@link GameBoardToolbar}. */
export type GameBoardToolbarProps = {
	game: Game
	status: Status
	/** The run of the board, from `useGame`. A run after the run of the page starts the readout again from 0. */
	run: number
	/** Draws the next number. */
	onDraw: (event: MouseEvent<HTMLButtonElement>) => void
	/** The ref of the Draw button. It is null while the bar has no Draw. */
	drawRef: Ref<HTMLButtonElement>
	/** Starts the run of a new seed, at each step. */
	onReset: () => void
	/** The ref of the Reset button. */
	resetRef: Ref<HTMLButtonElement>
	/** Shows Draw. With Auto-draw on, the game draws itself, so the bar has no Draw. */
	showDraw: boolean
}

/**
 * The bar of the drawn number, at the top of the game, over the box of the
 * slots, and the Reset button at its right, with a gap between them, as the
 * share menu sits at the right of the score bar. The readout rolls to each new
 * number, and the first number of each new run rolls from 0. At a load, it
 * shows the number with no roll. Before the first draw it shows 0, and after a
 * placement it keeps the number. On a bust, it is red.
 *
 * With Auto-draw off, the bar holds Draw while the run goes on. Draw is off
 * while a number waits for a slot. After a bust or a win, the bar has no Draw,
 * and Reset starts the next run. Reset starts a new run at each step. The bar
 * has 1rem of space on each side, as the score bar has. The bar has the tint
 * of a score cell, and it is at least as tall as a score cell (3rem), so its
 * height does not change when Draw shows or goes. The bar holds one control
 * at most, so it is a plain box and not a `Toolbar`: a toolbar with no
 * control is an empty group to a screen reader.
 */
export function GameBoardToolbar({
	game,
	status,
	run,
	onDraw,
	drawRef,
	onReset,
	resetRef,
	showDraw,
}: GameBoardToolbarProps) {
	return (
		<Flex align="center" gap="sm" className="mx-auto w-full max-w-md shrink-0 p-4">
			<Flex
				align="center"
				justify="between"
				className="min-h-12 min-w-0 flex-1 rounded-lg border border-transparent bg-zinc-950/5 p-1 ps-4 dark:bg-white/10"
			>
				<Text as="span" tone={TONES[status]} className="font-semibold text-3xl tabular-nums">
					<RunReadout key={run} value={game.last ?? 0} fromZero={run > 0} />
				</Text>

				{showDraw && !isEnded(status) && (
					<Button ref={drawRef} disabled={status === 'placing'} onClick={onDraw}>
						Draw
					</Button>
				)}
			</Flex>

			<Button ref={resetRef} variant="plain" aria-label="Reset" onClick={onReset}>
				<Icon icon={<RotateCcw />} />
			</Button>
		</Flex>
	)
}
