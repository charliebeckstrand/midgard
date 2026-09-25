import { useMemo, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Accordion, AccordionItem, AccordionPanel } from '../../components/accordion'
import { AccordionTrigger } from '../../components/accordion/accordion-trigger'
import { act, fireEvent, renderUI, screen } from '../helpers'

/**
 * A toggle renders only the accordion items that open or close.
 *
 * The open set was in the accordion context, and the `isOpen` and `toggle` of
 * the context depended on it. A toggle therefore gave each item a new context,
 * and each trigger and panel rendered. Each item now reads its own value from a
 * store, and `toggle` keeps its identity.
 *
 * The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../components/accordion/accordion-trigger', async (importActual) => {
	const actual = await importActual<typeof import('../../components/accordion/accordion-trigger')>()

	return { ...actual, AccordionTrigger: vi.fn(actual.AccordionTrigger) }
})

const VALUES = Array.from({ length: 30 }, (_, index) => `section-${index}`)

function items() {
	return VALUES.map((value) => (
		<AccordionItem key={value} value={value}>
			<AccordionTrigger>{value}</AccordionTrigger>
			<AccordionPanel>{`Body of ${value}`}</AccordionPanel>
		</AccordionItem>
	))
}

/** Clicks the trigger of `value`, and returns the trigger renders that it caused. */
function click(value: string) {
	vi.mocked(AccordionTrigger).mockClear()

	act(() => {
		fireEvent.click(screen.getByRole('button', { name: value }))
	})

	return vi.mocked(AccordionTrigger).mock.calls.length
}

describe('accordion item renders', () => {
	beforeEach(() => {
		vi.mocked(AccordionTrigger).mockClear()
	})

	it('renders only the opened item, then the closed and the opened one', () => {
		renderUI(<Accordion>{items()}</Accordion>)

		expect(click('section-3')).toBe(1)

		expect(screen.getByRole('button', { name: 'section-3' })).toHaveAttribute(
			'aria-expanded',
			'true',
		)

		// Single mode: one item closes and another opens.
		expect(click('section-7')).toBe(2)
	})

	it('renders only the toggled item of a multiple accordion', () => {
		renderUI(<Accordion type="multiple">{items()}</Accordion>)

		click('section-3')

		expect(click('section-9')).toBe(1)
	})

	it('renders only the changed items under control', () => {
		function Controlled() {
			const [value, setValue] = useState<string | null>(null)

			// Memoized, as a consumer that holds its item elements does. Without it,
			// each item renders from its new props, whatever the accordion does.
			const children = useMemo(items, [])

			return (
				<Accordion value={value} onValueChange={setValue}>
					{children}
				</Accordion>
			)
		}

		renderUI(<Controlled />)

		expect(click('section-2')).toBe(1)
	})
})
