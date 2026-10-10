import { describe, expect, it, vi } from 'vitest'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../components/lightbox'
import { REDUCED_MOTION_QUERY } from '../../utilities/media-query'
import {
	createEvent,
	fireEvent,
	getSlot,
	present,
	renderUI,
	screen,
	setupUser,
	stubMatchMedia,
	waitFor,
} from '../helpers'

const photos: LightboxPhoto[] = [
	{ src: '/a.jpg', alt: 'Harbor at dawn', width: 1500, height: 1000 },
	{ src: '/b.jpg', alt: 'Snow on a ridge', width: 1000, height: 1500, thumbnail: '/b-small.jpg' },
	{ src: '/c.jpg', alt: 'Field of poppies', width: 1200, height: 1200 },
]

function Gallery(props: Partial<Parameters<typeof Lightbox>[0]>) {
	return (
		<Lightbox photos={photos} {...props}>
			{photos.map((photo, index) => (
				<LightboxTrigger key={photo.src} index={index} />
			))}
		</Lightbox>
	)
}

/** The image of the photo in the center of the stage. */
function centerPhoto() {
	return document.querySelector<HTMLImageElement>('[data-offset="0"] img')
}

/**
 * Lays out the stage, 400px by 800px, and the photo in its center, 300px by
 * 200px at (50, 300). jsdom has no layout.
 */
function layOut(stage: HTMLElement) {
	const track = stage.firstElementChild as HTMLElement

	Object.defineProperty(stage, 'clientWidth', { value: 400, configurable: true })

	Object.defineProperty(stage, 'clientHeight', { value: 800, configurable: true })

	track.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 800 })

	const photo = present(centerPhoto(), 'photo')

	for (const [key, value] of Object.entries({
		offsetLeft: 50,
		offsetTop: 300,
		offsetWidth: 300,
		offsetHeight: 200,
	})) {
		Object.defineProperty(photo, key, { value, configurable: true })
	}

	return photo
}

/** A slow press on the stage. Each event gives its own time, in ms. */
function press(
	stage: HTMLElement,
	type: 'pointerDown' | 'pointerMove' | 'pointerUp',
	clientX: number,
	clientY: number,
	timeStamp: number,
	{ pointerId = 1, pointerType = 'mouse' }: { pointerId?: number; pointerType?: string } = {},
) {
	const event = createEvent[type](stage, {
		pointerId,
		pointerType,
		isPrimary: pointerId === 1,
		button: 0,
		clientX,
		clientY,
	})

	Object.defineProperty(event, 'timeStamp', { value: timeStamp })

	fireEvent(stage, event)
}

describe('Lightbox', () => {
	it('renders a thumbnail button for each photo, named by the photo', () => {
		renderUI(<Gallery />)

		const thumbnail = screen.getByRole('button', { name: 'Snow on a ridge' })

		expect(thumbnail).toHaveAttribute('data-slot', 'lightbox-trigger')

		expect(thumbnail).toHaveAttribute('aria-haspopup', 'dialog')

		expect(thumbnail).toHaveAttribute('type', 'button')

		expect(thumbnail.querySelector('img')).toHaveAttribute('src', '/b-small.jpg')

		expect(screen.queryByRole('dialog')).toBeNull()
	})

	it('opens the viewer at the photo of the thumbnail that the reader presses', async () => {
		const user = setupUser()

		const onIndexChange = vi.fn()

		renderUI(<Gallery onIndexChange={onIndexChange} />)

		await user.click(screen.getByRole('button', { name: 'Snow on a ridge' }))

		const dialog = screen.getByRole('dialog', { name: 'Photos' })

		expect(dialog).toHaveAttribute('aria-modal', 'true')

		expect(onIndexChange).toHaveBeenCalledWith(1)

		const photo = centerPhoto()

		expect(photo).toHaveAttribute('src', '/b.jpg')

		expect(photo).toHaveAttribute('alt', 'Snow on a ridge')

		// The thumbnail paints under the full photo until the full photo loads.
		expect(photo?.style.backgroundImage).toBe('url("/b-small.jpg")')

		expect(screen.getByText('2 / 3')).toBeInTheDocument()

		const previous = screen.getByRole('button', { name: 'Previous photo' })

		expect(previous).toBeEnabled()

		expect(previous).not.toHaveClass('invisible')
	})

	it('empties the thumbnail of the photo that is up', async () => {
		const user = setupUser()

		renderUI(<Gallery />)

		const thumbnail = screen.getByRole('button', { name: 'Harbor at dawn' })

		await user.click(thumbnail)

		expect(thumbnail.querySelector('img')).toHaveClass('opacity-0')

		expect(
			screen.getByRole('button', { name: 'Snow on a ridge' }).querySelector('img'),
		).not.toHaveClass('opacity-0')
	})

	it('keeps the photos next to the center out of the accessibility tree', () => {
		renderUI(<Gallery defaultIndex={1} />)

		const slots = document.querySelectorAll('[data-offset]')

		expect([...slots].map((slot) => slot.getAttribute('data-offset'))).toEqual(['-1', '0', '1'])

		for (const slot of slots) {
			const center = slot.getAttribute('data-offset') === '0'

			expect(slot.hasAttribute('inert')).toBe(!center)

			expect(slot.getAttribute('aria-hidden')).toBe(center ? null : 'true')
		}
	})

	it('steps through the photos with the arrow keys and the buttons', async () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		const user = setupUser()

		const onIndexChange = vi.fn()

		renderUI(<Gallery defaultIndex={0} onIndexChange={onIndexChange} />)

		expect(screen.getByRole('button', { name: 'Previous photo' })).toBeDisabled()

		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' })

		expect(centerPhoto()).toHaveAttribute('alt', 'Snow on a ridge')

		await user.click(screen.getByRole('button', { name: 'Next photo' }))

		expect(centerPhoto()).toHaveAttribute('alt', 'Field of poppies')

		expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled()

		// Past the last photo, a step does nothing.
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' })

		expect(onIndexChange.mock.calls).toEqual([[1], [2]])

		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' })

		expect(centerPhoto()).toHaveAttribute('alt', 'Snow on a ridge')
	})

	it('steps in the reading order of a right-to-left stage', () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		renderUI(<Gallery defaultIndex={0} />)

		const dialog = screen.getByRole('dialog')

		// jsdom computes no inherited direction, so the stage states its own.
		dialog.style.direction = 'rtl'

		fireEvent.keyDown(dialog, { key: 'ArrowLeft' })

		expect(centerPhoto()).toHaveAttribute('alt', 'Snow on a ridge')
	})

	it('closes on the close button with `closable`, and reports `null`', async () => {
		const user = setupUser()

		const onIndexChange = vi.fn()

		renderUI(<Gallery defaultIndex={2} closable onIndexChange={onIndexChange} />)

		await user.click(screen.getByRole('button', { name: 'Close' }))

		expect(onIndexChange).toHaveBeenCalledWith(null)

		expect(screen.queryByRole('dialog')).toBeNull()
	})

	it('closes on a press on the stage outside the photo, and not on the photo', async () => {
		const user = setupUser()

		renderUI(<Gallery defaultIndex={0} />)

		const photo = centerPhoto()

		if (!photo) throw new Error('no photo')

		await user.click(photo)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		await user.click(photo.parentElement as HTMLElement)

		expect(screen.queryByRole('dialog')).toBeNull()
	})

	it('closes on Escape', async () => {
		const user = setupUser()

		renderUI(<Gallery defaultIndex={0} />)

		await user.keyboard('{Escape}')

		expect(screen.queryByRole('dialog')).toBeNull()
	})

	it('raises the stage above the controls while a swipe up or down moves the photo', () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		renderUI(<Gallery defaultIndex={1} />)

		const stage = getSlot(document.body, 'lightbox-stage')

		// jsdom has no layout. A swipe of 40px on a stage 800px tall is short.
		Object.defineProperty(stage.firstElementChild, 'clientHeight', { value: 800 })

		press(stage, 'pointerDown', 100, 100, 0)

		press(stage, 'pointerMove', 100, 140, 1000)

		expect(stage).toHaveAttribute('data-raised')

		// A short, slow swipe puts the photo back, and the stage back under the controls.
		press(stage, 'pointerUp', 100, 140, 2000)

		expect(stage).not.toHaveAttribute('data-raised')

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	it('moves the only photo with a swipe to the side, and not the track', () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		renderUI(<Gallery photos={photos.slice(0, 1)} defaultIndex={0} />)

		const stage = getSlot(document.body, 'lightbox-stage')

		const track = stage.firstElementChild as HTMLElement

		Object.defineProperty(track, 'clientHeight', { value: 800 })

		press(stage, 'pointerDown', 100, 100, 0)

		press(stage, 'pointerMove', 140, 100, 1000)

		expect(track.style.transform).toBe('')

		expect(centerPhoto()?.style.transform).toMatch(/^translate\(4\d/)

		expect(stage).toHaveAttribute('data-raised')
	})

	it('moves the focus to the other step button when a step disables the pressed one', async () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		const user = setupUser()

		renderUI(<Gallery defaultIndex={1} />)

		await user.click(screen.getByRole('button', { name: 'Next photo' }))

		expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled()

		expect(screen.getByRole('button', { name: 'Previous photo' })).toHaveFocus()
	})

	it('does not drop a step that the reader presses during a slide', async () => {
		renderUI(<Gallery defaultIndex={0} />)

		const next = screen.getByRole('button', { name: 'Next photo' })

		// The second press comes while the first slide runs.
		fireEvent.click(next)

		fireEvent.click(next)

		await waitFor(() => expect(centerPhoto()).toHaveAttribute('alt', 'Field of poppies'))
	})

	it('reads the size of a photo with none from its thumbnail, and holds the button until then', () => {
		const unsized = [{ src: '/d.jpg', alt: 'Night market' }]

		renderUI(
			<Lightbox photos={unsized}>
				<LightboxTrigger index={0} />
			</Lightbox>,
		)

		const trigger = screen.getByRole('button', { name: 'Night market' })

		expect(trigger).toBeDisabled()

		expect(getSlot(trigger, 'placeholder')).toBeInTheDocument()

		const image = present(trigger.querySelector('img'), 'thumbnail')

		Object.defineProperties(image, {
			naturalWidth: { value: 800 },
			naturalHeight: { value: 600 },
		})

		fireEvent.load(image)

		expect(trigger).toBeEnabled()

		expect(trigger.querySelector('[data-slot="placeholder"]')).toBeNull()

		fireEvent.click(trigger)

		expect(centerPhoto()).toHaveAttribute('width', '800')
	})

	it('leaves a still placeholder for a thumbnail that does not load, and steps over its photo', () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		renderUI(<Gallery defaultIndex={0} />)

		const snow = present(
			screen.getByRole('button', { name: 'Snow on a ridge' }).querySelector('img'),
			'thumbnail',
		)

		fireEvent.error(snow)

		expect(screen.queryByRole('button', { name: 'Snow on a ridge' })).toBeNull()

		expect(screen.getByText('1 / 2')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))

		expect(centerPhoto()).toHaveAttribute('alt', 'Field of poppies')
	})

	it('follows a controlled index', () => {
		const { rerender } = renderUI(<Gallery index={null} />)

		expect(screen.queryByRole('dialog')).toBeNull()

		rerender(<Gallery index={2} />)

		expect(centerPhoto()).toHaveAttribute('alt', 'Field of poppies')
	})

	it('shows no step controls for one photo', () => {
		const first = photos.slice(0, 1)

		renderUI(
			<Lightbox photos={first} defaultIndex={0} closable>
				<LightboxTrigger />
			</Lightbox>,
		)

		expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Next photo' })).toBeNull()

		expect(screen.queryByText('1 / 1')).toBeNull()
	})

	it('takes the names of the viewer and its controls', () => {
		renderUI(
			<Gallery
				defaultIndex={1}
				closable
				aria-label="Trip photos"
				closeLabel="Fermer"
				previousLabel="Photo précédente"
				nextLabel="Photo suivante"
			/>,
		)

		expect(screen.getByRole('dialog', { name: 'Trip photos' })).toBeInTheDocument()

		for (const name of ['Fermer', 'Photo précédente', 'Photo suivante']) {
			expect(screen.getByRole('button', { name })).toBeInTheDocument()
		}
	})

	it('keeps a close button for the keyboard with no `closable`, and closes on Escape', async () => {
		const onIndexChange = vi.fn()

		renderUI(<Gallery defaultIndex={1} onIndexChange={onIndexChange} />)

		// It shows only when it has the keyboard focus.
		expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Next photo' })).toBeInTheDocument()

		await setupUser().keyboard('{Escape}')

		expect(onIndexChange).toHaveBeenLastCalledWith(null)
	})

	it('hides the step controls with `controls={false}`, and still steps on the arrow keys', () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		renderUI(<Gallery defaultIndex={0} closable controls={false} />)

		expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Next photo' })).toBeNull()

		expect(screen.queryByText('1 / 3')).toBeNull()

		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' })

		expect(centerPhoto()).toHaveAttribute('alt', 'Snow on a ridge')
	})

	it('hides the step button at the first photo, and keeps its place', () => {
		renderUI(<Gallery defaultIndex={0} />)

		const previous = screen.getByRole('button', { name: 'Previous photo' })

		expect(previous).toBeDisabled()

		expect(previous).toHaveClass('invisible')

		expect(screen.getByRole('button', { name: 'Next photo' })).not.toHaveClass('invisible')
	})

	it('moves each control to the next photo as the slide starts', () => {
		renderUI(<Gallery defaultIndex={0} />)

		const controls = getSlot(document.body, 'lightbox-controls')

		const edge = () => controls.style.getPropertyValue('--lightbox-edge')

		const before = edge()

		fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))

		// The slide runs, so the first photo is still in the center slot.
		expect(centerPhoto()).toHaveAttribute('alt', 'Harbor at dawn')

		expect(edge()).not.toBe(before)

		expect(edge()).toContain('1500px')

		expect(screen.getByText('2 / 3')).toBeInTheDocument()

		const previous = screen.getByRole('button', { name: 'Previous photo' })

		expect(previous).toBeEnabled()

		expect(previous).not.toHaveClass('invisible')
	})

	it('holds the step buttons and the count in one pill', () => {
		renderUI(<Gallery defaultIndex={1} />)

		const pill = present(
			screen.getByRole('button', { name: 'Previous photo' }).parentElement,
			'pill',
		)

		expect(screen.getByRole('button', { name: 'Next photo' }).parentElement).toBe(pill)

		expect(pill).toHaveTextContent('2 / 3')

		expect(pill).toHaveClass('rounded-full')
	})

	it('blurs the page behind the scrim, unless `blur` is false', () => {
		const { unmount } = renderUI(<Gallery defaultIndex={0} />)

		const layer = () => getSlot(document.body, 'lightbox-backdrop').parentElement

		expect(layer()).toHaveClass('backdrop-blur-lg')

		unmount()

		renderUI(<Gallery defaultIndex={0} blur={false} />)

		expect(layer()).not.toHaveClass('backdrop-blur-lg')
	})

	describe('zoom', () => {
		it('zooms into the point of a double tap on the photo, and back out on the next', () => {
			stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

			renderUI(<Gallery defaultIndex={1} />)

			const stage = getSlot(document.body, 'lightbox-stage')

			const photo = layOut(stage)

			const doubleTap = (start: number) => {
				press(photo, 'pointerDown', 200, 400, start)

				press(photo, 'pointerUp', 200, 400, start + 50)

				press(photo, 'pointerDown', 200, 400, start + 100)

				press(photo, 'pointerUp', 200, 400, start + 150)
			}

			doubleTap(0)

			// The point under the tap stays under it: (200 - 50) / 300 of the width.
			expect(photo.style.transform).toBe('translate(-225px, -150px) scale(2.5)')

			expect(stage).toHaveAttribute('data-zoomed')

			doubleTap(1000)

			expect(photo.style.transform).toBe('none')

			expect(stage).not.toHaveAttribute('data-zoomed')
		})

		it('does not take two taps far apart in time as a double tap', () => {
			stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

			renderUI(<Gallery defaultIndex={1} />)

			const photo = layOut(getSlot(document.body, 'lightbox-stage'))

			press(photo, 'pointerDown', 200, 400, 0)

			press(photo, 'pointerUp', 200, 400, 50)

			press(photo, 'pointerDown', 200, 400, 700)

			press(photo, 'pointerUp', 200, 400, 750)

			expect(photo.style.transform).toBe('')
		})

		it('scales the photo about the point between two fingers, then pans with the finger that stays', () => {
			stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

			renderUI(<Gallery defaultIndex={1} />)

			const stage = getSlot(document.body, 'lightbox-stage')

			const photo = layOut(stage)

			const first = { pointerId: 1, pointerType: 'touch' }

			const second = { pointerId: 2, pointerType: 'touch' }

			press(stage, 'pointerDown', 150, 400, 0, first)

			press(stage, 'pointerDown', 250, 400, 10, second)

			// The gap grows from 100px to 300px about (200, 400).
			press(stage, 'pointerMove', 350, 400, 20, second)

			press(stage, 'pointerMove', 50, 400, 30, first)

			expect(photo.style.transform).toBe('translate(-300px, -200px) scale(3)')

			press(stage, 'pointerUp', 350, 400, 40, second)

			press(stage, 'pointerMove', 100, 400, 50, first)

			expect(photo.style.transform).toBe('translate(-250px, -200px) scale(3)')

			press(stage, 'pointerUp', 100, 400, 60, first)

			expect(photo.style.transform).toBe('translate(-250px, -200px) scale(3)')

			expect(screen.getByRole('dialog')).toBeInTheDocument()
		})

		it('pans a zoomed photo with a swipe, and does not step or close', () => {
			stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

			renderUI(<Gallery defaultIndex={1} />)

			const stage = getSlot(document.body, 'lightbox-stage')

			const photo = layOut(stage)

			press(photo, 'pointerDown', 200, 400, 0)

			press(photo, 'pointerUp', 200, 400, 50)

			press(photo, 'pointerDown', 200, 400, 100)

			press(photo, 'pointerUp', 200, 400, 150)

			press(stage, 'pointerDown', 300, 400, 1000)

			press(stage, 'pointerMove', 200, 300, 1100)

			press(stage, 'pointerUp', 200, 300, 1200)

			// The photo is shorter than the stage, so it stays in the middle on that axis.
			expect(photo.style.transform).toBe('translate(-325px, -150px) scale(2.5)')

			expect(centerPhoto()).toBe(photo)

			expect(screen.getByRole('dialog')).toBeInTheDocument()
		})

		it('holds a pan inside the stage when the finger lifts past its edge', () => {
			stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

			renderUI(<Gallery defaultIndex={1} />)

			const stage = getSlot(document.body, 'lightbox-stage')

			const photo = layOut(stage)

			press(photo, 'pointerDown', 200, 400, 0)

			press(photo, 'pointerUp', 200, 400, 50)

			press(photo, 'pointerDown', 200, 400, 100)

			press(photo, 'pointerUp', 200, 400, 150)

			press(stage, 'pointerDown', 200, 400, 1000)

			press(stage, 'pointerMove', 600, 400, 1100)

			// The left edge of the photo stops at the left edge of the stage.
			press(stage, 'pointerUp', 600, 400, 1200)

			expect(photo.style.transform).toBe('translate(-50px, -150px) scale(2.5)')
		})

		it('zooms with + and -, pans with the arrow keys while zoomed, and goes back to rest with 0', () => {
			stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

			renderUI(<Gallery defaultIndex={1} />)

			const stage = getSlot(document.body, 'lightbox-stage')

			const photo = layOut(stage)

			const dialog = screen.getByRole('dialog')

			// The zoom keeps the center of the stage, (200, 400), in place.
			fireEvent.keyDown(dialog, { key: '+' })

			expect(photo.style.transform).toBe('translate(-75px, -50px) scale(1.5)')

			expect(stage).toHaveAttribute('data-zoomed')

			// A key with a modifier is for the browser.
			fireEvent.keyDown(dialog, { key: '=', ctrlKey: true })

			expect(photo.style.transform).toBe('translate(-75px, -50px) scale(1.5)')

			// A pan stops where the right edge of the photo meets the right edge of the stage.
			fireEvent.keyDown(dialog, { key: 'ArrowRight' })

			expect(photo.style.transform).toBe('translate(-100px, -50px) scale(1.5)')

			expect(centerPhoto()).toBe(photo)

			fireEvent.keyDown(dialog, { key: '0' })

			expect(photo.style.transform).toBe('none')

			expect(stage).not.toHaveAttribute('data-zoomed')

			fireEvent.keyDown(dialog, { key: '+' })

			fireEvent.keyDown(dialog, { key: '-' })

			expect(photo.style.transform).toBe('none')

			// At rest, the arrow keys step.
			fireEvent.keyDown(dialog, { key: 'ArrowRight' })

			expect(centerPhoto()).toHaveAttribute('alt', 'Field of poppies')
		})

		it('takes a zoomed photo back to rest when it steps away', () => {
			stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

			renderUI(<Gallery defaultIndex={1} />)

			const stage = getSlot(document.body, 'lightbox-stage')

			const photo = layOut(stage)

			press(photo, 'pointerDown', 200, 400, 0)

			press(photo, 'pointerUp', 200, 400, 50)

			press(photo, 'pointerDown', 200, 400, 100)

			press(photo, 'pointerUp', 200, 400, 150)

			fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))

			expect(photo.style.transform).toBe('none')

			expect(stage).not.toHaveAttribute('data-zoomed')

			expect(centerPhoto()).toHaveAttribute('alt', 'Field of poppies')
		})
	})
})
