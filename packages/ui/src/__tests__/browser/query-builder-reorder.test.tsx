import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	createGroup,
	QueryBuilder,
	type QueryField,
	type QueryGroup,
	type QueryRule,
} from '../../modules/query'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'
import { drag } from './helpers/drag'

/**
 * Rule reorder over real dnd-kit sensors: each child of a group is a vertical
 * sortable behind a grip. A drop commits through the tree's `move` action, and
 * each AND/OR keeps its position. Real focus and layout, so this runs in the
 * browser suite; the jsdom suite pins the grips.
 */
describe('QueryBuilder reorder (real browser)', () => {
	const fields: QueryField[] = [{ name: 'name', label: 'Name', type: 'text' }]

	const rule = (id: string, combinator: 'and' | 'or'): QueryRule => ({
		id,
		type: 'rule',
		combinator,
		field: 'name',
		operator: 'contains',
		value: id,
	})

	const initial = () => createGroup('and', [rule('a', 'and'), rule('b', 'or'), rule('c', 'and')])

	function Harness({ onValueChange }: { onValueChange: (value: QueryGroup) => void }) {
		const [query, setQuery] = useState(initial)

		return (
			<QueryBuilder
				fields={fields}
				value={query}
				onValueChange={(next) => {
					onValueChange(next)

					setQuery(next)
				}}
				reorder
			/>
		)
	}

	const order = (value: QueryGroup) => value.children.map((child) => child.id)

	const combinators = (value: QueryGroup) => value.children.map((child) => child.combinator)

	it('moves a rule down one position from the keyboard', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness onValueChange={onValueChange} />)

		const grip = screen.getByRole('button', { name: 'Reorder Name contains a' })

		grip.focus()

		// dnd-kit's keyboard sensor reads `code`: Space picks up, the arrow moves,
		// and Space drops.
		fireEvent.keyDown(grip, { code: 'Space' })

		await waitFor(() => expect(grip).toHaveAttribute('data-dragging'))

		fireEvent.keyDown(grip, { code: 'ArrowDown' })

		await waitFor(() =>
			expect(screen.getByText('Name contains a moved to position 2 of 3.')).toBeInTheDocument(),
		)

		fireEvent.keyDown(grip, { code: 'Space' })

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))

		const next: QueryGroup = onValueChange.mock.calls[0]?.[0]

		expect(order(next)).toEqual(['b', 'a', 'c'])

		// The combinators keep their positions: OR still joins positions 1 and 2.
		expect(combinators(next)).toEqual(['and', 'or', 'and'])

		await waitFor(() => expect(document.activeElement).toBe(grip))

		expect(screen.getByText('Dropped Name contains a, position 2 of 3.')).toBeInTheDocument()
	})

	it('cancels a keyboard move with Escape', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness onValueChange={onValueChange} />)

		const grip = screen.getByRole('button', { name: 'Reorder Name contains a' })

		grip.focus()

		fireEvent.keyDown(grip, { code: 'Space' })

		await waitFor(() => expect(grip).toHaveAttribute('data-dragging'))

		fireEvent.keyDown(grip, { code: 'ArrowDown' })

		fireEvent.keyDown(grip, { code: 'Escape' })

		await waitFor(() => expect(grip).not.toHaveAttribute('data-dragging'))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('moves the first rule below the second on a pointer drop', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness onValueChange={onValueChange} />)

		const grip = screen.getByRole('button', { name: 'Reorder Name contains a' })

		const target = screen.getByRole('button', { name: 'Reorder Name contains b' })

		const from = grip.getBoundingClientRect()

		const over = target.getBoundingClientRect()

		const x = from.x + 5

		const held = await drag(grip, { x, y: from.y + 5 }, [
			{ x, y: from.y + 12 },
			{ x, y: over.y + over.height / 2 + 4 },
		])

		await held.release()

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(order(onValueChange.mock.calls[0]?.[0])).toEqual(['b', 'a', 'c'])
	})
})
