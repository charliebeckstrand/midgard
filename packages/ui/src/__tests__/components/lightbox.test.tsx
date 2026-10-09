import { describe, expect, it, vi } from 'vitest'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../components/lightbox'
import { REDUCED_MOTION_QUERY } from '../../utilities/media-query'
import { fireEvent, renderUI, screen, setupUser, stubMatchMedia } from '../helpers'

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

	it('closes on the close button, and reports `null`', async () => {
		const user = setupUser()

		const onIndexChange = vi.fn()

		renderUI(<Gallery defaultIndex={2} onIndexChange={onIndexChange} />)

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

	it('follows a controlled index', () => {
		const { rerender } = renderUI(<Gallery index={null} />)

		expect(screen.queryByRole('dialog')).toBeNull()

		rerender(<Gallery index={2} />)

		expect(centerPhoto()).toHaveAttribute('alt', 'Field of poppies')
	})

	it('shows no step controls for one photo', () => {
		const first = photos.slice(0, 1)

		renderUI(
			<Lightbox photos={first} defaultIndex={0}>
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

	it('hides the close button with `closable={false}`, and still closes on Escape', async () => {
		const onIndexChange = vi.fn()

		renderUI(<Gallery defaultIndex={1} closable={false} onIndexChange={onIndexChange} />)

		expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()

		expect(screen.getByRole('button', { name: 'Next photo' })).toBeInTheDocument()

		await setupUser().keyboard('{Escape}')

		expect(onIndexChange).toHaveBeenLastCalledWith(null)
	})

	it('hides the step controls with `controls={false}`, and still steps on the arrow keys', () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		renderUI(<Gallery defaultIndex={0} controls={false} />)

		expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Next photo' })).toBeNull()

		expect(screen.queryByText('1 / 3')).toBeNull()

		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' })

		expect(centerPhoto()).toHaveAttribute('alt', 'Snow on a ridge')
	})

	it('gives the focus to the viewer when it shows no button', () => {
		renderUI(<Gallery defaultIndex={0} closable={false} controls={false} />)

		expect(screen.getByRole('dialog')).toHaveFocus()
	})

	it('paints the enabled step buttons solid and the disabled one soft', () => {
		renderUI(<Gallery defaultIndex={0} />)

		expect(screen.getByRole('button', { name: 'Previous photo' })).toHaveAttribute(
			'data-variant',
			'soft',
		)

		expect(screen.getByRole('button', { name: 'Next photo' })).toHaveAttribute(
			'data-variant',
			'solid',
		)
	})
})
