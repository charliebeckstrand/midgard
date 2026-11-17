'use client'

import { Fragment, type MouseEvent, type Ref, useEffect, useRef } from 'react'
import { Button, type ButtonProps } from 'ui/button'
import { cn } from 'ui/core'
import { useIntl } from 'ui/primitives/intl'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { canPlace, findGap, type Game, type Status } from '../../utilities/game'

/** Props for {@link GameBoardSlots}. */
export type GameBoardSlotsProps = {
	game: Game
	status: Status
	/** Puts the drawn number in the slot at `index`. The column of the CPU has none. */
	onPlace?: (index: number, event: MouseEvent<HTMLButtonElement>) => void
	/** The name of the column, which a screen reader speaks, when two columns show. */
	label?: string
	/** The ref of the column. */
	ref?: Ref<HTMLDivElement>
}

/** The color of a slot: green when it holds a number, amber when it can take the drawn number, and the default else. */
function getColor(placed: number | null, open: boolean): ButtonProps['color'] {
	if (placed !== null) return 'green'

	return open ? 'amber' : undefined
}

/**
 * One half of the dashed line of the gap mark. The two halves have the same
 * width, so the number is at the center, as the number of a slot is.
 */
const DASH = 'flex-1 border-t-2 border-dashed border-red-600 dark:border-red-500'

/**
 * The mark of a number that has no slot: a dashed line with the number at its
 * center, at the place where the number goes in the order. The mark shows on a
 * bust. In the column of the player, it then scrolls into view, because the box
 * of the slots can have it out of view. The scroll margin keeps about one slot
 * on each side of it in view, so the reader sees the two numbers around it. A
 * mark that is in view does not move.
 */
function GameBoardGap({ value, reveal }: { value: number; reveal: boolean }) {
	const intl = useIntl()

	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (reveal) ref.current?.scrollIntoView({ block: 'nearest' })
	}, [reveal])

	return (
		<Flex ref={ref} align="center" gap="sm" className="scroll-my-12">
			<span aria-hidden className={DASH} />

			<Text as="span" tone="error" className="font-semibold tabular-nums">
				{intl.formatNumber(value)}
			</Text>

			<span aria-hidden className={DASH} />
		</Flex>
	)
}

/**
 * The column of the slots, in ascending order from the top. An empty slot
 * shows its position, and a filled slot shows its number in a soft green. Only
 * a slot that can take the drawn number is on, with an amber outline. A filled
 * slot stays off, but it does not dim as an off slot does: the reader reads
 * its number to choose the slot of the next number. After a bust, the gap mark
 * shows between the two numbers that the drawn number goes between. The column
 * of the CPU has no drawn number that waits, so each of its slots stays off.
 */
export function GameBoardSlots({ game, status, onPlace, label, ref }: GameBoardSlotsProps) {
	const intl = useIntl()

	const { slots, drawn } = game

	const bust = status === 'bust' && drawn !== null

	// The slot that the drawn number goes after; -1 puts the mark above the first slot.
	const gap = bust ? findGap(slots, drawn) : null

	// Only the column of the player scrolls to its mark. The column of the CPU
	// can bust while the player plays on.
	const reveal = onPlace !== undefined

	return (
		<Stack ref={ref} gap="sm" role={label ? 'group' : undefined} aria-label={label}>
			{bust && gap === -1 ? <GameBoardGap value={drawn} reveal={reveal} /> : null}

			{slots.map((placed, index) => {
				const open = status === 'placing' && drawn !== null && canPlace(slots, index, drawn)

				const position = intl.formatNumber(index + 1)

				return (
					// By position, because the slots never move.
					<Fragment key={index}>
						<Button
							variant={placed === null ? 'outline' : 'soft'}
							color={getColor(placed, open)}
							disabled={!open}
							aria-label={
								placed === null
									? `Slot ${position}`
									: `Slot ${position}, ${intl.formatNumber(placed)}`
							}
							className={cn('w-full tabular-nums', placed !== null && 'disabled:opacity-100')}
							onClick={(event) => onPlace?.(index, event)}
						>
							{placed === null ? position : intl.formatNumber(placed)}
						</Button>

						{bust && gap === index ? <GameBoardGap value={drawn} reveal={reveal} /> : null}
					</Fragment>
				)
			})}
		</Stack>
	)
}
