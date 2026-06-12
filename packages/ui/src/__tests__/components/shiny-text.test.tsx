import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShinyText, ShinyTextSkeleton } from '../../components/shiny-text'
import { bySlot, renderUI, stubMatchMedia, userEvent } from '../helpers'

const { pauseSpy, playSpy } = vi.hoisted(() => ({ pauseSpy: vi.fn(), playSpy: vi.fn() }))

// Stubs the imperative sweep so hover pause/resume is observable in jsdom.
vi.mock('motion', async (importOriginal) => {
	const mod = await importOriginal<typeof import('motion')>()

	return {
		...mod,
		animate: vi.fn(() => ({ pause: pauseSpy, play: playSpy, stop: vi.fn() })),
	}
})

describe('ShinyText', () => {
	afterEach(() => {
		vi.unstubAllGlobals()

		pauseSpy.mockClear()

		playSpy.mockClear()
	})

	it('renders its children inside the masked span', () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')
	})

	it('masks the text with the gradient highlight', () => {
		const { container } = renderUI(<ShinyText shineColor="red">Shine</ShinyText>)

		const el = bySlot(container, 'shiny-text')

		expect(el).toHaveClass('bg-clip-text', 'text-transparent')
		expect(el?.style.backgroundImage).toContain('red')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<ShinyText id="hero">Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveAttribute('id', 'hero')
	})

	it('pairs with an explicit ShinyTextSkeleton in loading trees', () => {
		const { container } = renderUI(<ShinyTextSkeleton />)

		expect(bySlot(container, 'shiny-text')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('still renders the text under reduced motion', () => {
		stubMatchMedia((query) => query.includes('prefers-reduced-motion'))

		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')
	})

	it('runs a consumer hover handler without clobbering pauseOnHover', async () => {
		const onMouseEnter = vi.fn()
		const onMouseLeave = vi.fn()

		const { container } = renderUI(
			<ShinyText pauseOnHover onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
				Shine
			</ShinyText>,
		)

		const el = bySlot(container, 'shiny-text') as HTMLElement

		const user = userEvent.setup()

		await user.hover(el)

		expect(onMouseEnter).toHaveBeenCalled()
		expect(pauseSpy).toHaveBeenCalled()

		await user.unhover(el)

		expect(onMouseLeave).toHaveBeenCalled()
		expect(playSpy).toHaveBeenCalled()
	})
})
