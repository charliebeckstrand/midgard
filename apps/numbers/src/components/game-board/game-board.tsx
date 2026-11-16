'use client'

import type { User } from 'auth'
import { usePathname } from 'next/navigation'
import { type MouseEvent, useEffect, useEffectEvent, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useA11yAnnouncements } from 'ui/hooks'
import { useIntl } from 'ui/primitives/intl'
import { Columns } from 'ui/structure/columns'
import { useDailyNotice } from '../../hooks/use-daily-notice'
import { useGame } from '../../hooks/use-game'
import { useGameSetting } from '../../hooks/use-game-setting'
import { useRunRecorder } from '../../hooks/use-run-recorder'
import {
	countPlaced,
	getOutcome,
	getStatus,
	isEnded,
	isUnfinished,
	playCpu,
	SLOTS,
} from '../../utilities/game'
import { createSeed, isSeed, runPath } from '../../utilities/seed'
import { describeStatus } from './describe-status'
import { GameBoardFooter } from './game-board-footer'
import { GameBoardSlots } from './game-board-slots'
import { GameBoardToolbar } from './game-board-toolbar'

/** Props for {@link GameBoard}. */
export type GameBoardProps = {
	/** The seed of the address, which the run of the page starts from. */
	seed: string
	/** Plays against the CPU: the page of a `/vs` address. */
	vsCpu?: boolean
	/** The signed-in user, whose stats count each finished run, or none. */
	user?: User
}

/**
 * The game: the bar with the drawn number and its action at the top, the
 * column of slots, and the bar of the score at the bottom. Against the CPU, a
 * second column beside the slots holds the game of the CPU on the same deck,
 * and the bar shows both scores, also with Show score off, because it names
 * the columns and gives the result. The game fills the body, and only the slots scroll, between the two bars. The bars do not cover
 * the slots, so a slot that gets the focus scrolls into view clear of them.
 * The box of the slots has the full width of the body, so a wheel at the side
 * of the column scrolls it too.
 *
 * A run of the daily puzzle of today, after its first run counted, tells a
 * signed-in reader that it already counts (see `useDailyNotice`).
 *
 * A Reset starts the run of a new seed in place, in the same mode, and adds the
 * address of the seed to the history, so the reader can send the run. A link,
 * Back, and Forward go to the run of the seed of the address, from its start.
 *
 * @remarks
 * An action can turn off the control that the reader pressed: Draw is off
 * while a number waits, and a filled slot is off. The focus then moves to the
 * next control to use: the first slot that can take the number, or else the
 * action button. The move happens only when the pressed control had the focus.
 * Safari does not give the focus to a pressed button, so it moves no focus.
 * Chrome and Firefox give the focus to a pressed button, so a pointer press
 * also moves the focus, but the page does not scroll to it: the reader looks at
 * the pressed control. A key press (`detail` 0) scrolls the next control into
 * view.
 */
export function GameBoard({ seed, user, vsCpu = false }: GameBoardProps) {
	const [autoDraw] = useGameSetting('autoDraw')

	const [showScore] = useGameSetting('showScore')

	const [difficulty] = useGameSetting('difficulty')

	const mode = vsCpu ? 'vsCpu' : 'solo'

	const recordRun = useRunRecorder(user, mode)

	const { game, status, run, draw, place, reset } = useGame(seed, autoDraw, recordRun)

	useDailyNotice(game, run, mode, user)

	const ended = isEnded(status)

	// The CPU places each number after the player places it, so the player
	// chooses first. When the game of the player ends, the CPU plays the rest of
	// its deck. The game of the CPU comes from the seed, so a change of the level
	// plays the same numbers again at the new level.
	const cpu = vsCpu ? playCpu(game.seed, ended ? SLOTS : countPlaced(game.slots), difficulty) : null

	const outcome = cpu && ended ? getOutcome(game, cpu) : null

	const actionRef = useRef<HTMLButtonElement>(null)

	const slotsRef = useRef<HTMLDivElement>(null)

	const intl = useIntl()

	useA11yAnnouncements(describeStatus(game, status, cpu, intl.formatNumber))

	/** Runs `action`, then gives the focus to the next control when the pressed control had it. */
	const act = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
		const focused = event.currentTarget === document.activeElement

		// The update commits before the focus moves, so the next control is on.
		flushSync(action)

		if (!focused) return

		const slot = slotsRef.current?.querySelector<HTMLButtonElement>('button:enabled')

		;(slot ?? actionRef.current)?.focus({ preventScroll: event.detail > 0 })
	}

	/** Starts the run of a new seed, and writes its address. */
	const restart = () => {
		// A bust or a win counted when it ended. A Reset after the first placement
		// counts the run with its score. A link, Back, or Forward leaves the run, and
		// the run does not count.
		if (isUnfinished(game)) recordRun(game)

		const next = createSeed()

		window.history.pushState(null, '', runPath(next, vsCpu))

		reset(next)
	}

	// The address of the page. Next gives each change of it: a link, Back,
	// Forward, and the `pushState` of a Reset.
	const pathname = usePathname()

	/** Starts the run of the seed of the address from its start. */
	const follow = useEffectEvent((next: string) => {
		if (isSeed(next)) reset(next)
	})

	// The effect runs at each change of the address. Cache Components holds a
	// route that the reader leaves, and shows it again on a return. The effect
	// also runs at each show, so a return to a held route starts its run again.
	// The seed is the last segment, also of a `/vs` address.
	useEffect(() => follow(pathname.split('/').at(-1) ?? ''), [pathname])

	return (
		<div className="flex h-full flex-col print:h-auto">
			<GameBoardToolbar
				game={game}
				status={status}
				run={run}
				actionRef={actionRef}
				onAction={(event) => act(event, ended ? restart : draw)}
				onReset={restart}
				showAction={ended || !autoDraw}
			/>

			{/* `relative` keeps each positioned element in the box, as in `StackedLayoutBody`. */}
			<div className="relative min-h-0 flex-1 scroll-py-1 overflow-y-auto print:overflow-visible">
				{/* The padding keeps the focus ring of the first and the last slot in the box. */}
				<Columns columns={cpu ? 2 : 1} gap="sm" className="mx-auto w-full max-w-md px-4 py-1">
					<GameBoardSlots
						ref={slotsRef}
						game={game}
						status={status}
						label={cpu ? 'You' : undefined}
						onPlace={(index, event) => act(event, () => place(index))}
					/>

					{cpu && <GameBoardSlots game={cpu} status={getStatus(cpu)} label="CPU" />}
				</Columns>
			</div>

			<GameBoardFooter
				game={game}
				showScore={showScore}
				cpu={cpu}
				difficulty={difficulty}
				outcome={outcome}
			/>
		</div>
	)
}
