import { type Ref, useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useListKeepFocus } from '../../components/list/use-list-keep-focus'
import { renderUI, screen } from '../helpers'

/**
 * A list whose root changes from `<ul>` to `<ol>` with `swap`, as a reorderable
 * List changes its `<ul>` to the `Reorder` group. Each row then mounts again.
 */
function Rows({ swap }: { swap: boolean }) {
	const ref = useRef<HTMLElement>(null)

	useListKeepFocus(ref, swap)

	const rows = ['a', 'b'].map((id) => (
		<li key={id} data-slot="list-item" data-item-id={id}>
			<span>{id}</span>
			<button type="button">Remove {id}</button>
		</li>
	))

	return (
		<>
			{swap ? (
				<ol ref={ref as Ref<HTMLOListElement>}>{rows}</ol>
			) : (
				<ul ref={ref as Ref<HTMLUListElement>}>{rows}</ul>
			)}
			<button type="button">Outside</button>
		</>
	)
}

describe('useListKeepFocus', () => {
	it('gives the focus to the same control of the new row when the rows mount again', () => {
		const { rerender } = renderUI(<Rows swap={false} />)

		screen.getByRole('button', { name: 'Remove b' }).focus()

		rerender(<Rows swap />)

		const next = screen.getByRole('button', { name: 'Remove b' })

		expect(next.closest('ol')).not.toBeNull()

		expect(document.activeElement).toBe(next)
	})

	it('leaves a focus outside the list where it is', () => {
		const { rerender } = renderUI(<Rows swap={false} />)

		screen.getByRole('button', { name: 'Remove b' }).focus()

		const outside = screen.getByRole('button', { name: 'Outside' })

		outside.focus()

		rerender(<Rows swap />)

		expect(document.activeElement).toBe(outside)
	})
})
