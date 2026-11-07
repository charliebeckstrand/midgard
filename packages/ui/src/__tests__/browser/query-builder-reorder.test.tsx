import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
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

	// Kanban, Dashboard, and List turn the focus indicator violet while lifted.
	// The query grip kept the blue focus ring.
	it('shows the lift accent on the focused grip', async () => {
		renderUI(<Harness onValueChange={() => {}} />)

		const grip = screen.getByRole('button', { name: 'Reorder Name contains a' })

		// A Tab gives the grip `:focus-visible`, as a keyboard user has it.
		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(grip)

		const resting = getComputedStyle(grip).outlineColor

		await userEvent.keyboard(' ')

		await expect.poll(() => grip.hasAttribute('data-dragging')).toBe(true)

		// The accent is the color of a probe with the lift outline class.
		const probe = document.createElement('div')

		probe.className = 'outline-violet-600'

		document.body.append(probe)

		const accent = getComputedStyle(probe).outlineColor

		probe.remove()

		expect(accent).not.toBe(resting)

		await expect.poll(() => getComputedStyle(grip).outlineColor).toBe(accent)

		await userEvent.keyboard('{Escape}')
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

/**
 * The keyboard move of a lifted node from one group into another: the arrow
 * toward the end of the line moves it into the group next to it, and the arrow
 * toward the start of the line moves it out of its group. The group that then
 * holds the node keeps it lifted and focuses its grip.
 */
describe('QueryBuilder keyboard move across groups (real browser)', () => {
	const fields: QueryField[] = [{ name: 'name', label: 'Name', type: 'text' }]

	const rule = (id: string, combinator: 'and' | 'or' = 'and'): QueryRule => ({
		id,
		type: 'rule',
		combinator,
		field: 'name',
		operator: 'contains',
		value: id,
	})

	/** The root holds the group g of x and y, then the rule a. */
	const initial = (): QueryGroup =>
		createGroup('and', [{ ...createGroup('or', [rule('x'), rule('y', 'or')]), id: 'g' }, rule('a')])

	function Harness({
		onValueChange,
		requireRule = false,
	}: {
		onValueChange: (value: QueryGroup) => void
		requireRule?: boolean
	}) {
		const [query, setQuery] = useState(initial)

		return (
			<QueryBuilder
				fields={fields}
				value={query}
				onValueChange={(next) => {
					onValueChange(next)

					setQuery(next)
				}}
				requireRule={requireRule}
				reorder
			/>
		)
	}

	const ids = (nodes: { id: string }[]) => nodes.map((node) => node.id)

	const grip = (name: string) => screen.getByRole('button', { name: `Reorder ${name}` })

	const lift = async (name: string) => {
		grip(name).focus()

		fireEvent.keyDown(grip(name), { key: ' ' })

		await waitFor(() => expect(grip(name)).toHaveAttribute('data-dragging'))
	}

	it('moves a lifted rule into the group before it, and out again', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness onValueChange={onValueChange} />)

		await lift('Name contains a')

		fireEvent.keyDown(grip('Name contains a'), { key: 'ArrowRight' })

		await waitFor(() =>
			expect(
				screen.getByText('Name contains a moved to position 3 of 3 in condition group.'),
			).toBeInTheDocument(),
		)

		const into: QueryGroup = onValueChange.mock.calls[0]?.[0]

		expect(ids(into.children)).toEqual(['g'])

		const inner = into.children[0] as QueryGroup

		expect(ids(inner.children)).toEqual(['x', 'y', 'a'])

		// a takes the OR of y, the node before the end.
		expect(inner.children[2]?.combinator).toBe('or')

		// The group that holds the rule now keeps it lifted, on its focused grip.
		await waitFor(() => expect(document.activeElement).toBe(grip('Name contains a')))

		expect(grip('Name contains a')).toHaveAttribute('data-dragging')

		fireEvent.keyDown(grip('Name contains a'), { key: 'ArrowLeft' })

		await waitFor(() =>
			expect(
				screen.getByText('Name contains a moved to position 2 of 2 in the query.'),
			).toBeInTheDocument(),
		)

		expect(ids(onValueChange.mock.calls[1]?.[0].children)).toEqual(['g', 'a'])

		await waitFor(() => expect(document.activeElement).toBe(grip('Name contains a')))

		expect(grip('Name contains a')).toHaveAttribute('data-dragging')

		fireEvent.keyDown(grip('Name contains a'), { key: ' ' })

		await waitFor(() => expect(grip('Name contains a')).not.toHaveAttribute('data-dragging'))

		expect(onValueChange).toHaveBeenCalledTimes(2)
	})

	it('moves a lifted rule into the group after it, as its first node', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness onValueChange={onValueChange} />)

		// Up past g first, so g is after a.
		await lift('Name contains a')

		fireEvent.keyDown(grip('Name contains a'), { key: 'ArrowUp' })

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))

		await waitFor(() => expect(document.activeElement).toBe(grip('Name contains a')))

		fireEvent.keyDown(grip('Name contains a'), { key: 'ArrowRight' })

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2))

		const inner = onValueChange.mock.calls[1]?.[0].children[0] as QueryGroup

		expect(ids(inner.children)).toEqual(['a', 'x', 'y'])

		await waitFor(() => expect(document.activeElement).toBe(grip('Name contains a')))

		fireEvent.keyDown(grip('Name contains a'), { key: 'Escape' })
	})

	// In a right-to-left layout the line starts at the right, so the arrows swap.
	it('moves into a group with the left arrow in a right-to-left layout', async () => {
		const onValueChange = vi.fn()

		renderUI(
			<div dir="rtl">
				<Harness onValueChange={onValueChange} />
			</div>,
		)

		await lift('Name contains a')

		fireEvent.keyDown(grip('Name contains a'), { key: 'ArrowRight' })

		expect(onValueChange).not.toHaveBeenCalled()

		fireEvent.keyDown(grip('Name contains a'), { key: 'ArrowLeft' })

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))

		const value: QueryGroup = onValueChange.mock.calls[0]?.[0]

		expect(ids((value.children[0] as QueryGroup).children)).toEqual(['x', 'y', 'a'])

		await waitFor(() => expect(document.activeElement).toBe(grip('Name contains a')))

		fireEvent.keyDown(grip('Name contains a'), { key: 'Escape' })
	})

	it('keeps the sole rule of a group in it under requireRule', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness onValueChange={onValueChange} requireRule />)

		await lift('Name contains x')

		// Into the root: x leaves g, and y stays in it.
		fireEvent.keyDown(grip('Name contains x'), { key: 'ArrowLeft' })

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))

		const value: QueryGroup = onValueChange.mock.calls[0]?.[0]

		expect(ids(value.children)).toEqual(['g', 'x', 'a'])

		// y is the sole node of g now, so it shows no grip and does not leave.
		expect(screen.queryByRole('button', { name: 'Reorder Name contains y' })).toBeNull()

		await waitFor(() => expect(document.activeElement).toBe(grip('Name contains x')))

		fireEvent.keyDown(grip('Name contains x'), { key: 'Escape' })
	})
})
