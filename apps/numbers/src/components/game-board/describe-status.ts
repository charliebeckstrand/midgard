import {
	countPlaced,
	type Game,
	getOutcome,
	type Outcome,
	SLOTS,
	type Status,
} from '../../utilities/game'

/** The text that a screen reader speaks for the result against the CPU. */
const OUTCOMES: Record<Outcome, string> = { win: 'You win', loss: 'The CPU wins', tie: 'A tie' }

/**
 * The text that a screen reader speaks for each step: the drawn number, a bust
 * with its score, or a win. Against the CPU, the end also gives the result,
 * with both scores.
 */
export function describeStatus(
	game: Game,
	status: Status,
	cpu: Game | null,
	format: (value: number) => string,
): string {
	if (game.drawn !== null && status === 'placing') return format(game.drawn)

	if (status !== 'bust' && status !== 'won') return ''

	const placed = countPlaced(game.slots)

	const end =
		status === 'bust' && game.drawn !== null
			? `${format(game.drawn)} has no slot. Score ${format(placed)} of ${format(SLOTS)}`
			: `All ${format(SLOTS)} placed`

	if (!cpu) return end

	return `${end}. ${OUTCOMES[getOutcome(game, cpu)]}, ${format(placed)} to ${format(countPlaced(cpu.slots))}`
}
