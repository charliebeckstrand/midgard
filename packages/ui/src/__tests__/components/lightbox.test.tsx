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

/** A slow press on the stage. Each event gives its own time, in ms. */
function press(
	stage: HTMLElement,
	type: 'pointerDown' | 'pointerMove' | 'pointerUp',
	clientX: number,
	clientY: number,
	timeStamp: number,
) {
	const event = createEvent[type](stage, {
		pointerId: 1,
		isPrimary: true,
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
})
