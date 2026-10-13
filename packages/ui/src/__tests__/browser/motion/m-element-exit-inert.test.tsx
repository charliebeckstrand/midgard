import { AnimatePresence } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * An HTML `m` element is `inert` while it exits under `AnimatePresence`, and
 * each `m` element in the exiting subtree is too. The `inert` prop of the
 * caller stays.
 *
 * Real Motion is necessary: the instant mock removes the child in the commit
 * that closes it, so no exit occurs.
 */
const fade = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
	transition: { duration: 0.2 },
}

function Panel({ open, inert = false }: { open: boolean; inert?: boolean }) {
	return (
		<ReducedMotion>
			<AnimatePresence initial={false}>
				{open && (
					<m.div data-testid="panel" inert={inert} {...fade}>
						<m.span data-testid="inner" />
					</m.div>
				)}
			</AnimatePresence>
			<m.div data-testid="outside" />
		</ReducedMotion>
	)
}

describe('m element exit (real Motion)', () => {
	it('is inert while it exits, with each m element under it', async () => {
		const { rerender } = renderUI(<Panel open />)

		const panel = screen.getByTestId('panel')

		const inner = screen.getByTestId('inner')

		expect(panel).not.toHaveAttribute('inert')

		rerender(<Panel open={false} />)

		expect(panel).toHaveAttribute('inert')

		expect(inner).toHaveAttribute('inert')

		expect(screen.getByTestId('outside')).not.toHaveAttribute('inert')

		await waitFor(() => expect(panel).not.toBeInTheDocument())
	})

	it('clears the mark when it opens again during the exit', () => {
		const { rerender } = renderUI(<Panel open />)

		const panel = screen.getByTestId('panel')

		rerender(<Panel open={false} />)

		expect(panel).toHaveAttribute('inert')

		rerender(<Panel open />)

		expect(screen.getByTestId('panel')).toBe(panel)

		expect(panel).not.toHaveAttribute('inert')
	})

	it('keeps the inert prop of the caller while it is present', () => {
		renderUI(<Panel open inert />)

		expect(screen.getByTestId('panel')).toHaveAttribute('inert')
	})
})
