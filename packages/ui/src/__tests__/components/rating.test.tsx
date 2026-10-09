import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Description, Field, Label } from '../../components/fieldset'
import { Form } from '../../components/form'
import { useFormState } from '../../components/form/context'
import { Rating, RatingSkeleton } from '../../components/rating'
import { allBySlot, bySlot, renderUI, screen, setupUser } from '../helpers'

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
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(<Rating aria-label="Score" onValueChange={onValueChange} />)

		await user.click(stars(container)[3] as HTMLInputElement)

		expect(onValueChange).toHaveBeenCalledWith(4)
	})

	it('clears when the current score is clicked again', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Rating aria-label="Score" defaultValue={4} onValueChange={onValueChange} />,
		)

		await user.click(stars(container)[3] as HTMLInputElement)

		expect(onValueChange).toHaveBeenCalledWith(null)

		// The canceled activation restores the radio, so no `change` set the same
		// star straight back.
		expect(onValueChange).toHaveBeenCalledTimes(1)
	})

	it('recedes the fill while the pointer rests on the star that would clear it', async () => {
		const user = setupUser()

		const { container } = renderUI(<Rating aria-label="Score" defaultValue={1} />)

		const fill = () => allBySlot(container, 'rating-fill')[0]

		expect(fill()).not.toHaveClass('opacity-40')

		// At a score of one this is the only filled star, so without the recede
		// nothing on the row answers the pointer.
		await user.hover(allBySlot(container, 'rating-star')[0] as HTMLElement)

		expect(fill()).toHaveClass('opacity-40')
	})

	it('previews rather than recedes on a star that would set a score', async () => {
		const user = setupUser()

		const { container } = renderUI(<Rating aria-label="Score" defaultValue={1} />)

		await user.hover(allBySlot(container, 'rating-star')[2] as HTMLElement)

		expect(allBySlot(container, 'rating-fill')).toHaveLength(3)

		for (const fill of allBySlot(container, 'rating-fill')) {
			expect(fill).not.toHaveClass('opacity-40')
		}
	})

	// A tap sends the compatibility mouse events with no leave after them, so a
	// preview from them stays on the new score and draws it as cleared.
	it('does not recede the score that a tap sets', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(<Rating aria-label="Score" onValueChange={onValueChange} />)

		await user.pointer({ keys: '[TouchA]', target: stars(container)[2] as HTMLInputElement })

		expect(onValueChange).toHaveBeenLastCalledWith(3)

		expect(allBySlot(container, 'rating-fill')).toHaveLength(3)

		for (const fill of allBySlot(container, 'rating-fill')) {
			expect(fill).not.toHaveClass('opacity-40')
		}
	})

	it('does not recede when there is nothing to clear', async () => {
		const user = setupUser()

		const { container } = renderUI(<Rating aria-label="Score" defaultValue={1} clearable={false} />)

		await user.hover(allBySlot(container, 'rating-star')[0] as HTMLElement)

		expect(allBySlot(container, 'rating-fill')[0]).not.toHaveClass('opacity-40')
	})

	it('keeps the score when clearable is off', async () => {
		const user = setupUser()

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
		const user = setupUser()

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
				<Label as="span">How was it?</Label>
				<Rating defaultValue={3} />
			</Field>,
		)

		const group = bySlot(container, 'rating')

		const labelId = bySlot(container, 'label')?.getAttribute('id')

		expect(group).toHaveAttribute('aria-labelledby', labelId)

		// The two naming attributes are never both set.
		expect(group).not.toHaveAttribute('aria-label')
	})

	describe('half step', () => {
		it('renders two radios per star, the half score first', () => {
			const { container } = renderUI(<Rating aria-label="Score" step={0.5} count={2} />)

			expect(stars(container).map((star) => star.value)).toEqual(['0.5', '1', '1.5', '2'])

			expect(allBySlot(container, 'rating-star')).toHaveLength(2)
		})

		it('names each half through getValueText', () => {
			const { container } = renderUI(<Rating aria-label="Score" step={0.5} count={1} />)

			expect(stars(container).map((star) => star.getAttribute('aria-label'))).toEqual([
				'0.5 out of 1 stars',
				'1 out of 1 stars',
			])
		})

		it('commits a half score and draws half of that star', async () => {
			const user = setupUser()

			const onValueChange = vi.fn()

			const { container } = renderUI(
				<Rating aria-label="Score" step={0.5} onValueChange={onValueChange} />,
			)

			await user.click(stars(container)[6] as HTMLInputElement)

			expect(onValueChange).toHaveBeenCalledWith(3.5)

			const fills = allBySlot(container, 'rating-fill')

			expect(fills).toHaveLength(4)

			expect(fills[3]).toHaveStyle({ width: '50%' })
		})

		it('previews the half under the pointer', async () => {
			const user = setupUser()

			const { container } = renderUI(<Rating aria-label="Score" step={0.5} />)

			await user.hover(allBySlot(container, 'rating-half')[4] as HTMLElement)

			const fills = allBySlot(container, 'rating-fill')

			expect(fills).toHaveLength(3)

			expect(fills[2]).toHaveStyle({ width: '50%' })
		})

		it('clears when the current half score is clicked again', async () => {
			const user = setupUser()

			const onValueChange = vi.fn()

			const { container } = renderUI(
				<Rating aria-label="Score" step={0.5} defaultValue={2.5} onValueChange={onValueChange} />,
			)

			expect(stars(container)[4]?.checked).toBe(true)

			await user.click(stars(container)[4] as HTMLInputElement)

			expect(onValueChange).toHaveBeenCalledWith(null)

			expect(onValueChange).toHaveBeenCalledTimes(1)
		})
	})

	describe('read-only', () => {
		it('renders one labeled image and takes no input', () => {
			const { container } = renderUI(<Rating readOnly value={4} />)

			const group = bySlot(container, 'rating')

			expect(group).toHaveAttribute('role', 'img')

			expect(group).toHaveAttribute('aria-label', '4 out of 5 stars')

			expect(stars(container)).toHaveLength(0)
		})

		it('joins the score to a consumer aria-label', () => {
			renderUI(<Rating readOnly aria-label="Quality" value={4} />)

			expect(screen.getByRole('img')).toHaveAccessibleName('Quality 4 out of 5 stars')
		})

		it('joins the score to a consumer aria-labelledby', () => {
			renderUI(
				<>
					<span id="rating-name">Service</span>
					<Rating readOnly aria-labelledby="rating-name" value={2} />
				</>,
			)

			expect(screen.getByRole('img')).toHaveAccessibleName('Service 2 out of 5 stars')
		})

		it('joins the score to an enclosing Field label', () => {
			renderUI(
				<Field>
					<Label as="span">How was it?</Label>
					<Rating readOnly value={3} />
				</Field>,
			)

			expect(screen.getByRole('img')).toHaveAccessibleName('How was it? 3 out of 5 stars')
		})

		it('keeps a consumer aria-describedby', () => {
			renderUI(
				<>
					<span id="rating-note">Average of 12 reviews</span>
					<Rating readOnly aria-label="Quality" aria-describedby="rating-note" value={4} />
				</>,
			)

			expect(screen.getByRole('img')).toHaveAccessibleDescription('Average of 12 reviews')
		})

		it('takes the description of an enclosing Field', () => {
			renderUI(
				<Field>
					<Label as="span">How was it?</Label>
					<Rating readOnly value={3} />
					<Description>From your last visit</Description>
				</Field>,
			)

			expect(screen.getByRole('img')).toHaveAccessibleDescription('From your last visit')
		})

		it('draws a fractional score as a part star', () => {
			const { container } = renderUI(<Rating readOnly value={3.5} />)

			expect(allBySlot(container, 'rating-star')).toHaveLength(5)

			const fills = allBySlot(container, 'rating-fill')

			expect(fills).toHaveLength(1)

			expect(fills[0]?.style.width).toBe('50%')

			const whole = allBySlot(container, 'rating-star').filter(
				(star) => star.getAttribute('fill') === 'currentColor',
			)

			expect(whole).toHaveLength(3)
		})

		it('draws a whole or an empty star as one glyph', () => {
			const { container } = renderUI(<Rating readOnly value={2} />)

			const tags = allBySlot(container, 'rating-star').map((star) => star.tagName.toLowerCase())

			expect(tags).toEqual(['svg', 'svg', 'svg', 'svg', 'svg'])

			expect(allBySlot(container, 'rating-fill')).toHaveLength(0)
		})
	})

	it('takes no input while disabled', () => {
		const { container } = renderUI(<Rating aria-label="Score" disabled defaultValue={3} />)

		expect(bySlot(container, 'rating')).toHaveAttribute('data-disabled')

		expect(stars(container)).toHaveLength(0)

		expect(screen.getByRole('img')).toHaveAccessibleName('Score 3 out of 5 stars')
	})

	it('takes the description of an enclosing Field while disabled', () => {
		renderUI(
			<Field>
				<Label as="span">How was it?</Label>
				<Rating disabled defaultValue={3} />
				<Description>Rating closes after a week</Description>
			</Field>,
		)

		expect(screen.getByRole('img')).toHaveAccessibleDescription('Rating closes after a week')
	})
})

describe('RatingSkeleton', () => {
	// The class strings came from the render before the skeleton moved from the
	// extras into the config. A change in them is a change in the silhouette.
	// The stepped glyph `density-size-*` wins over the Placeholder's default height.
	const placeholder =
		'bg-zinc-200 dark:bg-zinc-700 motion-safe:animate-pulse block density-any:h-4 rounded-sm'

	// The glyph and the gap are stepped classes, so the browser picks the step of the nearest
	// scope. The real row and its stars share them.
	const row =
		'inline-flex items-center w-fit disabled:opacity-50 data-disabled:opacity-50 group-disabled:opacity-50 motion-safe:transition-opacity motion-safe:duration-150 density-gap-[0.5,0.5,1]'

	const hue = 'text-amber-600 dark:text-amber-500'

	const glyph = 'density-size-[4,4.5,5,5.5,6]'

	it.each(['sm', 'md', 'lg', undefined] as const)(
		'keeps the silhouette classes at size %s',
		(size) => {
			const { container } = renderUI(<RatingSkeleton size={size} count={2} />)

			const rowEl = container.firstElementChild as HTMLElement

			expect(rowEl.className).toBe(`${row} ${hue}`)

			expect(rowEl.dataset.density).toBe(size)

			const classes = allBySlot(container, 'placeholder').map((star) => star.className)

			expect(classes).toEqual([`${placeholder} ${glyph}`, `${placeholder} ${glyph}`])
		},
	)

	/*
	 * A rating can sit in a line of text, so its skeleton has to be able to as well. Parsed back
	 * from server markup, the way a browser meets it: a `div` inside a `<p>` makes the parser
	 * close the paragraph there, and the tree it hydrates no longer matches.
	 */
	it('stands in for a rating inside a paragraph, as server markup', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<p>
				Rated <RatingSkeleton count={2} />
			</p>,
		)

		const paragraph = container.querySelector('p')

		const row = paragraph?.lastElementChild

		expect(row?.tagName).toBe('SPAN')

		expect(allBySlot(container, 'placeholder').map((star) => star.tagName)).toEqual([
			'SPAN',
			'SPAN',
		])

		expect(container.children).toHaveLength(1)
	})
})
