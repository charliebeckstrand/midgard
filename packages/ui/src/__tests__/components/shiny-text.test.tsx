import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShinyText, ShinyTextSkeleton } from '../../components/shiny-text'
import { bySlot, renderUI, stubMatchMedia, userEvent } from '../helpers'

const { animateSpy, pauseSpy, playSpy } = vi.hoisted(() => {
	const pauseSpy = vi.fn()
	const playSpy = vi.fn()

	return {
		animateSpy: vi.fn(() => ({ pause: pauseSpy, play: playSpy, stop: vi.fn() })),
		pauseSpy,
		playSpy,
	}
})

// Stubs the imperative sweep so the gate can observe whether a sweep starts at
// all (animateSpy) and hover pause/resume (pause/playSpy) in jsdom.
vi.mock('motion', async (importOriginal) => {
	const mod = await importOriginal<typeof import('motion')>()

	return {
		...mod,
		animate: animateSpy,
	}
})

describe('ShinyText', () => {
	// The mocked useReducedMotion reads matchMedia on every render. Under the vmThreads
	// pool, a concurrent reduced-motion test can leave its stub active here. These
	// motion-allowed cases would then skip the sweep. Pin matchMedia non-reduced before
	// each test; the reduced-motion case re-stubs it.
	beforeEach(() => {
		stubMatchMedia(() => false)
	})

	afterEach(() => {
		vi.unstubAllGlobals()

		animateSpy.mockClear()

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

	it('starts the sweep when motion is allowed', () => {
		renderUI(<ShinyText>Shine</ShinyText>)

		// Positive control: anchors the negative assertions below.
		expect(animateSpy).toHaveBeenCalled()
	})

	it('renders static text and starts no sweep under reduced motion', () => {
		stubMatchMedia((query) => query.includes('prefers-reduced-motion'))

		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')

		// WCAG 2.3.3: the OS preference parks the sweep before it ever starts —
		// the text must remain, but no animation is allowed to run.
		expect(animateSpy).not.toHaveBeenCalled()
	})

	it('renders static text and starts no sweep when disabled', () => {
		const { container } = renderUI(<ShinyText disabled>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')

		expect(animateSpy).not.toHaveBeenCalled()
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
