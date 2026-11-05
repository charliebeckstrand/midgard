import { render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { getSlot } from '../../__tests__/helpers/slot-queries.ts'
import { LetterRail } from '../app/letter-rail.tsx'
import { ExampleFrame } from '../kit/example.tsx'
import type { PageLink } from '../plugin/pages.ts'

// Under forced colors, a part of the docs that the reader sees only by its
// background keeps a paint (CONVENTIONS §5.10). Forced colors replace each
// background with `Canvas`, so a grip or a surface on `Canvas` disappears.

const page = (name: string): PageLink => ({
	category: 'components',
	name,
	path: `/${name.toLowerCase()}`,
	tabs: [],
})

function Rail() {
	const bodyRef = useRef<HTMLDivElement>(null)

	return <LetterRail pages={[page('Accordion'), page('Badge')]} bodyRef={bodyRef} />
}

describe('the docs under forced colors', () => {
	// On a coarse pointer, the grip is the only resize control of an example.
	it('paints the touch grip of an example in CanvasText', () => {
		const { container } = render(
			<ExampleFrame meta={{ title: 'Basic', id: 'basic', code: () => new Promise(() => {}) }}>
				<span>Instance</span>
			</ExampleFrame>,
		)

		const grip = getSlot(container, 'example-resize-grip')

		expect(grip.classList).toContain('forced-colors:after:bg-[CanvasText]')
	})

	// The bubble is a circle of background color with a letter in it.
	it('outlines the letter bubble of the rail', () => {
		const { container } = render(<Rail />)

		const bubble = getSlot(container, 'letter-rail-bubble')

		expect([...bubble.classList]).toEqual(
			expect.arrayContaining(['forced-colors:outline-solid', 'forced-colors:outline-1']),
		)
	})
})
