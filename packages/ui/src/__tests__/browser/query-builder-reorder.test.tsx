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

/**
 * The keyboard reorder of the query builder: each child of a group lifts from
 * its grip, and each move commits through the tree's `move` action. Each AND/OR
 * keeps its position. Real focus, so this runs in the browser suite. The pointer
 * drag needs the real Motion, so it runs in `motion/query-builder-reorder.test.tsx`.
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

		// Space picks up, each arrow moves and commits, and Space drops.
		fireEvent.keyDown(grip, { key: ' ' })

		await waitFor(() => expect(grip).toHaveAttribute('data-dragging'))

		fireEvent.keyDown(grip, { key: 'ArrowDown' })

		await waitFor(() =>
			expect(screen.getByText('Name contains a moved to position 2 of 3.')).toBeInTheDocument(),
		)

		expect(onValueChange).toHaveBeenCalledTimes(1)

		const next: QueryGroup = onValueChange.mock.calls[0]?.[0]

		expect(order(next)).toEqual(['b', 'a', 'c'])

		// The combinators keep their positions: OR still joins positions 1 and 2.
		expect(combinators(next)).toEqual(['and', 'or', 'and'])

		// The move re-renders the nodes, and the grip takes the focus back.
		await waitFor(() => expect(document.activeElement).toBe(grip))

		fireEvent.keyDown(grip, { key: ' ' })

		await waitFor(() => expect(grip).not.toHaveAttribute('data-dragging'))

		expect(screen.getByText('Dropped Name contains a, position 2 of 3.')).toBeInTheDocument()

		expect(onValueChange).toHaveBeenCalledTimes(1)
	})

	it('drops a keyboard lift with Escape', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness onValueChange={onValueChange} />)

		const grip = screen.getByRole('button', { name: 'Reorder Name contains a' })

		grip.focus()

		fireEvent.keyDown(grip, { key: ' ' })

		await waitFor(() => expect(grip).toHaveAttribute('data-dragging'))

		fireEvent.keyDown(grip, { key: 'Escape' })

		await waitFor(() => expect(grip).not.toHaveAttribute('data-dragging'))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('moves focus between the grips with the arrows when nothing is lifted', () => {
		renderUI(<Harness onValueChange={() => {}} />)

		const grip = screen.getByRole('button', { name: 'Reorder Name contains a' })

		grip.focus()

		fireEvent.keyDown(grip, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Reorder Name contains b' }),
		)
	})

	it('describes the reorder keys on each grip', () => {
		renderUI(<Harness onValueChange={() => {}} />)

		const grip = screen.getByRole('button', { name: 'Reorder Name contains a' })

		expect(grip).toHaveAccessibleDescription(/To pick up an item, press Space/)
	})
})
