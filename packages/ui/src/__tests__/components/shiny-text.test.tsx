import { animate } from 'motion'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShinyText, ShinyTextSkeleton } from '../../components/shiny-text'
import { bySlot, renderUI, stubMatchMedia, userEvent } from '../helpers'

// `animate` is the imperative sweep, stubbed globally in setup/module-mocks.ts
// (a per-file vi.mock('motion') resolves inconsistently under the vmThreads
// pool). The gate watches whether a sweep starts (animate) and hover
// pause/resume (pause/playSpy).
const pauseSpy = vi.fn()

const playSpy = vi.fn()

describe('ShinyText', () => {
	beforeEach(() => {
		// Motion-allowed baseline; the reduced-motion case re-stubs it.
		stubMatchMedia(() => false)

		// Stub the controls so the sweep never runs in jsdom while hover
		// pause/resume stays observable.
		vi.mocked(animate).mockReturnValue({
			pause: pauseSpy,
			play: playSpy,
			stop: vi.fn(),
		} as unknown as ReturnType<typeof animate>)
	})

	afterEach(() => {
		vi.unstubAllGlobals()

		vi.mocked(animate).mockClear()

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
		expect(animate).toHaveBeenCalled()
	})

	it('renders static text and starts no sweep under reduced motion', () => {
		stubMatchMedia((query) => query.includes('prefers-reduced-motion'))

		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')

		// WCAG 2.3.3: the OS preference parks the sweep before it ever starts —
		// the text must remain, but no animation is allowed to run.
		expect(animate).not.toHaveBeenCalled()
	})

	it('renders static text and starts no sweep when disabled', () => {
		const { container } = renderUI(<ShinyText disabled>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')

		expect(animate).not.toHaveBeenCalled()
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
