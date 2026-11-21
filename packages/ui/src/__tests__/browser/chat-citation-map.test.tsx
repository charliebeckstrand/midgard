import { useMemo, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
	type ChatCitation,
	ChatCitationProvider,
	ChatMessage,
	toStopSelection,
} from '../../modules/chat'
import { MapPoints } from '../../modules/map'
import { allBySlot, renderUI, tableRows } from '../helpers'
import { overlayPlat } from '../helpers/map-plat'

const SOURCE = 'Two stops are late: the depot and the yard.'

const QUOTE = 'Two stops are late'

const CITATION: ChatCitation = {
	id: 'c1',
	start: SOURCE.indexOf(QUOTE),
	end: SOURCE.indexOf(QUOTE) + QUOTE.length,
	quote: QUOTE,
	target: 'late-stops',
	selector: { stops: ['yard', 'depot'] },
}

/** Three stops far apart in the fixture frame, so each draws as its own dot. */
const ROWS = [
	{ key: 'depot', at: [5, 5] as [number, number], label: 'Depot' },
	{ key: 'annex', at: [15, 5] as [number, number], label: 'Annex' },
	{ key: 'yard', at: [25, 5] as [number, number], label: 'Yard' },
]

const targets = { 'late-stops': { label: 'Late stops' } }

/**
 * A chat beside a map. `rows` are the stops that the app draws, so the index
 * of a stop counts them.
 */
function ChatBesideMap({ rows }: { rows: typeof ROWS }) {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	const getIndex = useMemo(() => {
		const indexByKey = new Map(rows.map((row, index) => [row.key, index]))

		return (key: string) => indexByKey.get(key)
	}, [rows])

	return (
		<>
			<ChatCitationProvider targets={targets} cited={cited} onCite={setCited}>
				<ChatMessage sender="assistant">
					{[{ kind: 'text', id: 't1', text: SOURCE, citations: [CITATION] }]}
				</ChatMessage>
			</ChatCitationProvider>
			{overlayPlat(<MapPoints id="stops" label="Stops" points={rows} />, {
				selectedOverlays:
					cited?.target === 'late-stops'
						? toStopSelection(cited.selector, 'stops', getIndex)
						: undefined,
			})}
		</>
	)
}

/**
 * A citation in a reply selects the stops that it names on a map beside the
 * chat. The agent names a stop by the key of its row, and the app gives the
 * index of that row in the points that it draws.
 */
describe('Chat: a citation selects stops on a map', () => {
	it('haloes each named stop, and the table reads each one as selected', async () => {
		const { container } = renderUI(<ChatBesideMap rows={ROWS} />)

		expect(allBySlot(container, 'map-points-selected')).toHaveLength(0)

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement?.getAttribute('data-slot')).toBe('chat-citation')

		await userEvent.keyboard('{Enter}')

		expect(allBySlot(container, 'map-points-selected')).toHaveLength(2)

		expect(tableRows(container)).toEqual(['Depot, selected', 'Annex', 'Yard, selected'])

		await userEvent.keyboard('{Enter}')

		expect(allBySlot(container, 'map-points-selected')).toHaveLength(0)
	})

	it('follows the rows that the app draws, and skips a stop that it does not draw', async () => {
		const shown = ROWS.filter((row) => row.key !== 'depot')

		const { container } = renderUI(<ChatBesideMap rows={shown} />)

		await userEvent.keyboard('{Tab}')

		await userEvent.keyboard('{Enter}')

		expect(allBySlot(container, 'map-points-selected')).toHaveLength(1)

		expect(tableRows(container)).toEqual(['Annex', 'Yard, selected'])
	})
})
