'use client'

import Image from 'next/image'
import { Button } from 'ui/button'
import { cn } from 'ui/core'
import { Message } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Columns } from 'ui/structure/columns'
import type { Game } from '../../types'
import { formatLine, pickLine } from '../../utilities/grade'
import { isLocked, isOff } from '../../utilities/locks'
import { GameStatus } from '../game-card'
import { LinePending, PendingDot } from '../pick-line'

/**
 * The pick of one game, as a row of the grid of the prediction form. Each
 * side is a button with its logo and its line, and the pressed side is the
 * pick. A game that has kicked off is locked. A game without a line takes a
 * pick all the same. Each side then shows {@link PendingDot} in the place of
 * the line, and a tooltip on hover says so. A postponed or a canceled game is
 * locked, and a badge after its sides says so.
 */
export function PickField({ game }: { game: Game }) {
	const { value, setValue, invalid } = useFormValue<string>(game.id, {})

	const locked = isLocked(game, Date.now())

	return (
		// The sides take the first column of the grid, and the badge takes the second.
		<div className="col-span-full grid grid-cols-subgrid items-center">
			<fieldset className="min-w-0">
				<legend className="sr-only">
					{game.away.name} at {game.home.name}
				</legend>

				<Columns columns={2} gap="xs">
					{[game.away, game.home].map((team) => {
						const picked = value === team.id

						const line = pickLine(game, team.id)

						const side = (
							<Button
								key={team.id}
								type="button"
								variant={picked ? 'soft' : 'plain'}
								color={picked ? 'blue' : 'zinc'}
								aria-pressed={picked}
								disabled={locked}
								onClick={() => setValue(team.id)}
								className={cn(
									'w-full justify-start',
									invalid && 'ring-1 ring-red-500 ring-inset dark:ring-red-400',
								)}
							>
								{team.logo === null ? null : (
									<Image
										src={team.logo}
										alt=""
										width={20}
										height={20}
										unoptimized
										className="size-5 shrink-0"
									/>
								)}
								<span className={cn('font-medium', !picked && 'text-zinc-700 dark:text-zinc-300')}>
									{team.abbreviation}
								</span>
								{line === null ? (
									<PendingDot className="ms-auto" />
								) : (
									<span className="ms-auto tabular-nums text-zinc-500 dark:text-zinc-400">
										{formatLine(line)}
									</span>
								)}
							</Button>
						)

						return line === null ? <LinePending key={team.id}>{side}</LinePending> : side
					})}
				</Columns>
			</fieldset>

			{isOff(game) ? (
				<span className="flex justify-self-end">
					<GameStatus game={game} />
				</span>
			) : null}

			<Message name={game.id} className="sr-only" />
		</div>
	)
}
