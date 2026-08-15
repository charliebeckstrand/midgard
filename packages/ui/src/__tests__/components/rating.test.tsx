import { describe, expect, it, vi } from 'vitest'
import { Field, Label } from '../../components/fieldset'
import { Form, useFormState } from '../../components/form'
import { Rating, RatingSkeleton } from '../../components/rating'
import { allBySlot, bySlot, renderUI, screen, userEvent } from '../helpers'

/** The stars' own radios, in draw order. */
function stars(container: HTMLElement): HTMLInputElement[] {
	return allBySlot(container, 'rating-input') as HTMLInputElement[]
}

/** Reads one form field back out of the store, for the binding assertions. */
function FormValue({ name }: { name: string }) {
	const state = useFormState()

	return <output>{String(state?.values[name])}</output>
}

describe('Rating', () => {
	it('pairs with an explicit RatingSkeleton in loading trees', () => {
		const { container } = renderUI(<RatingSkeleton />)

		expect(bySlot(container, 'rating')).not.toBeInTheDocument()

		expect(allBySlot(container, 'placeholder')).toHaveLength(5)
	})

	it('renders one radio per star in a named radiogroup', () => {
		const { container } = renderUI(<Rating aria-label="Score" />)

		const group = bySlot(container, 'rating')

		expect(group).toHaveAttribute('role', 'radiogroup')

		expect(group).toHaveAttribute('aria-label', 'Score')

		expect(stars(container)).toHaveLength(5)
	})

	it('takes the star count from `count`', () => {
		const { container } = renderUI(<Rating aria-label="Score" count={3} />)

		expect(stars(container)).toHaveLength(3)
	})

	it('groups its radios under an id of its own, not the bound field name', () => {
		const { container } = renderUI(
			<Form defaultValues={{ score: 0 }}>
				<Rating aria-label="Score" name="score" />
			</Form>,
		)

		// Two ratings bound to different fields must not merge into one native
		// group, so the grouping name is never the field name.
		expect(stars(container)[0]?.name).not.toBe('score')
	})

	it('checks the radio standing for the current value', () => {
		const { container } = renderUI(<Rating aria-label="Score" defaultValue={3} />)

		expect(stars(container).map((star) => star.checked)).toEqual([false, false, true, false, false])
	})

	it('names each star through getValueText', () => {
		const { container } = renderUI(
			<Rating aria-label="Score" count={3} getValueText={(v, c) => `${v}/${c}`} />,
		)

		expect(stars(container).map((star) => star.getAttribute('aria-label'))).toEqual([
			'1/3',
			'2/3',
			'3/3',
		])
	})

	it('commits the picked star', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		const { container } = renderUI(<Rating aria-label="Score" onValueChange={onValueChange} />)

		await user.click(stars(container)[3] as HTMLInputElement)

		expect(onValueChange).toHaveBeenCalledWith(4)
	})

	it('clears when the current score is clicked again', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Rating aria-label="Score" defaultValue={4} onValueChange={onValueChange} />,
		)

		await user.click(stars(container)[3] as HTMLInputElement)

		expect(onValueChange).toHaveBeenCalledWith(null)

		// The cancelled activation restores the radio, so no `change` set the same
		// star straight back.
		expect(onValueChange).toHaveBeenCalledTimes(1)
	})

	it('recedes the fill while the pointer rests on the star that would clear it', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<Rating aria-label="Score" defaultValue={1} />)

		const fill = () => allBySlot(container, 'rating-fill')[0]

		expect(fill()).not.toHaveClass('opacity-40')

		// At a score of one this is the only filled star, so without the recede
		// nothing on the row answers the pointer.
		await user.hover(allBySlot(container, 'rating-star')[0] as HTMLElement)

		expect(fill()).toHaveClass('opacity-40')
	})

	it('previews rather than recedes on a star that would set a score', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<Rating aria-label="Score" defaultValue={1} />)

		await user.hover(allBySlot(container, 'rating-star')[2] as HTMLElement)

		expect(allBySlot(container, 'rating-fill')).toHaveLength(3)

		for (const fill of allBySlot(container, 'rating-fill')) {
			expect(fill).not.toHaveClass('opacity-40')
		}
	})

	it('does not recede when there is nothing to clear', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<Rating aria-label="Score" defaultValue={1} clearable={false} />)

		await user.hover(allBySlot(container, 'rating-star')[0] as HTMLElement)

		expect(allBySlot(container, 'rating-fill')[0]).not.toHaveClass('opacity-40')
	})

	it('keeps the score when clearable is off', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Rating
				aria-label="Score"
				defaultValue={4}
				clearable={false}
				onValueChange={onValueChange}
			/>,
		)

		await user.click(stars(container)[3] as HTMLInputElement)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('binds to a Form field by name', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Form defaultValues={{ score: 2 }}>
				<Rating aria-label="Score" name="score" />
				<FormValue name="score" />
			</Form>,
		)

		expect(stars(container)[1]?.checked).toBe(true)

		await user.click(stars(container)[4] as HTMLInputElement)

		expect(screen.getByText('5')).toBeInTheDocument()
	})

	it('names the group from an enclosing Field label', () => {
		const { container } = renderUI(
			<Field>
				<Label>How was it?</Label>
				<Rating defaultValue={3} />
			</Field>,
		)

		const group = bySlot(container, 'rating')

		const labelId = bySlot(container, 'label')?.getAttribute('id')

		expect(group).toHaveAttribute('aria-labelledby', labelId)

		// The two naming attributes are never both set.
		expect(group).not.toHaveAttribute('aria-label')
	})

	describe('read-only', () => {
		it('renders one labelled image and takes no input', () => {
			const { container } = renderUI(<Rating readOnly value={4} />)

			const group = bySlot(container, 'rating')

			expect(group).toHaveAttribute('role', 'img')

			expect(group).toHaveAttribute('aria-label', '4 out of 5 stars')

			expect(stars(container)).toHaveLength(0)
		})

		it('draws a fractional score as a part star', () => {
			const { container } = renderUI(<Rating readOnly value={3.5} />)

			const widths = allBySlot(container, 'rating-star').map(
				(star) => (star.querySelector('span') as HTMLElement | null)?.style.width ?? '',
			)

			expect(widths).toEqual(['100%', '100%', '100%', '50%', ''])
		})
	})

	it('takes no input while disabled', () => {
		const { container } = renderUI(<Rating aria-label="Score" disabled defaultValue={3} />)

		expect(bySlot(container, 'rating')).toHaveAttribute('data-disabled')

		expect(stars(container)).toHaveLength(0)
	})
})
