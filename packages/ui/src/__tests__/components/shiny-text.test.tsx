import { animate } from 'motion'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShinyText, ShinyTextSkeleton } from '../../components/shiny-text'
import { bySlot, getSlot, renderUI, stubMatchMedia } from '../helpers'
import { installControlledObserver } from '../helpers/controlled-intersection'

// `animate` is the imperative sweep, stubbed globally in setup/module-mocks.ts,
// which is also why this file drives that mock with spies rather than declaring
// its own. The gate watches whether a sweep starts.

describe('ShinyText', () => {
	beforeEach(() => {
		// Motion-allowed baseline; the reduced-motion case re-stubs it.
		stubMatchMedia(() => false)

		// `animate` is the shared module spy. `restoreMocks` only reverts
		// vi.spyOn implementations, not a plain vi.fn's call history, so nothing
		// global zeroes it between tests — only this file's afterEach does, which
		// leaves a window after it runs. Clear it here for a per-test baseline:
		// without one, a sweep recorded on the spy after a sibling's afterEach (a
		// deferred effect, surfaced when sequence.shuffle reorders siblings) leaks
		// into the negative `not.toHaveBeenCalled()` assertions below.
		vi.mocked(animate).mockClear()

		// Stub the controls so the sweep never runs in jsdom.
		vi.mocked(animate).mockReturnValue({
			stop: vi.fn(),
		} as unknown as ReturnType<typeof animate>)
	})

	afterEach(() => {
		// Restore animate's call-through default.
		vi.mocked(animate).mockRestore()
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

	it('merges a consumer style rather than losing the gradient to it', () => {
		const { container } = renderUI(
			<ShinyText shineColor="red" style={{ marginInlineStart: 4 }}>
				Shine
			</ShinyText>,
		)

		const el = bySlot(container, 'shiny-text')

		// The consumer's own key lands.
		expect(el?.style.marginInlineStart).toBe('4px')

		// The keys that carry the sweep survive it. `backgroundPosition` is a
		// MotionValue, which the motion mock strips, so only these two are
		// observable here.
		expect(el?.style.backgroundImage).toContain('red')

		// jsdom normalizes `200% auto` to `200%`.
		expect(el?.style.backgroundSize).toContain('200%')
	})

	it('starts the sweep when motion is allowed', () => {
		renderUI(<ShinyText>Shine</ShinyText>)

		// Positive control: anchors the negative assertions below.
		expect(animate).toHaveBeenCalled()
	})

	// The gradient is twice the width of the text, so a position of p% puts the
	// shine at (1 - p/100) of the text width. A shine that travels left needs a
	// position that increases.
	it('moves the shine to the left', () => {
		renderUI(<ShinyText>Shine</ShinyText>)

		expect(vi.mocked(animate).mock.calls[0]?.[1]).toBe(150)
	})

	it('renders static text and starts no sweep under reduced motion', () => {
		stubMatchMedia((query) => query.includes('prefers-reduced-motion'))

		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')

		// WCAG 2.3.3: the OS preference parks the sweep before it ever starts —
		// the text must remain, but no animation is allowed to run.
		expect(animate).not.toHaveBeenCalled()
	})

	it('stops the sweep off screen and starts it again in view', () => {
		const observer = installControlledObserver()

		renderUI(<ShinyText>Shine</ShinyText>)

		expect(animate).not.toHaveBeenCalled()

		observer.report(true)

		expect(animate).toHaveBeenCalledTimes(1)

		const controls = vi.mocked(animate).mock.results[0]?.value as { stop: () => void }

		observer.report(false)

		expect(controls.stop).toHaveBeenCalled()

		observer.report(true)

		expect(animate).toHaveBeenCalledTimes(2)
	})

	it('renders static text and starts no sweep when disabled', () => {
		const { container } = renderUI(<ShinyText disabled>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')

		expect(animate).not.toHaveBeenCalled()
	})
})

describe('ShinyTextSkeleton', () => {
	it('renders an inline span with a width, so it is valid in a paragraph and does not collapse', () => {
		const { container } = renderUI(
			<p>
				Status: <ShinyTextSkeleton />
			</p>,
		)

		const el = getSlot(container, 'placeholder')

		expect(el.tagName).toBe('SPAN')

		expect(el.parentElement?.tagName).toBe('P')

		expect(el).toHaveClass('inline-block', 'w-full')
	})
})
