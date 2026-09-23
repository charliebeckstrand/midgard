import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Density } from '../../primitives/density'
import { corpus } from '../a11y/cases'
import type {
	DensitySubject,
	LinkSubject,
	PassthroughSubject,
	SkeletonSubject,
	TextInputSubject,
} from '../a11y/cases/types'
import { allBySlot, bySlot, getSlot, renderUI } from '../helpers'

/**
 * Capability sweeps, derived from the shared corpus: a guarantee that holds for
 * every component of a kind is asserted once here, and a new component writes a
 * column rather than a copy of the test
 * ([CONVENTIONS.md](../../../../../CONVENTIONS.md) §10.5).
 *
 * The sweeps share one file because they share one input. The corpus
 * reaches most of the component tree, so each file that imports it makes
 * another worker build that graph.
 *
 * Each sweep owns the value it passes — the id it spreads, the href it sets —
 * so an entry cannot assert something it did not render.
 */
const PASS_THROUGH_ID = 'pass-through-subject'

const LINK_HREF = '/swept-link'

const PLACEHOLDER = 'Swept placeholder'

// Three distinct steps, so each density leg can tell its answer from the other two.
const AMBIENT = 'lg'

const EXPLICIT = 'sm'

const FALLBACK = 'md'

const passThrough = corpus.flatMap((entry) => entry.passthrough ?? [])

const skeletons = corpus.flatMap((entry) => entry.skeleton ?? [])

const links = corpus.flatMap((entry) => entry.link ?? [])

// Two columns reuse a slot across entries (`control` for the three toggles,
// `input` for Input and TagInput), so these titles name the entry as well.
const densities = corpus.flatMap((entry) =>
	(entry.density ?? []).map((subject) => ({
		...subject,
		title: `${entry.name} (${subject.slot})`,
	})),
)

const textInputs = corpus.flatMap((entry) =>
	(entry.textInput ?? []).map((subject) => ({
		...subject,
		title: `${entry.name} (${subject.slot})`,
	})),
)

/** The pass-through sweep: the id it spreads reaches the subject's slot. */
function passesThrough({ render, slot }: PassthroughSubject) {
	const { container } = renderUI(render({ id: PASS_THROUGH_ID }))

	expect(getSlot(container, slot)).toHaveAttribute('id', PASS_THROUGH_ID)
}

/** The skeleton sweep: the silhouette draws placeholders, and never the real component. */
function drawsSkeleton({ element, absentSlot, placeholders }: SkeletonSubject) {
	const { container } = renderUI(element)

	expect(bySlot(container, absentSlot)).not.toBeInTheDocument()

	const drawn = allBySlot(container, 'placeholder')

	expect(drawn.length).toBeGreaterThan(0)

	// A silhouette whose count is part of its contract states it; the rest claim
	// only that they draw something.
	if (placeholders !== undefined) expect(drawn).toHaveLength(placeholders)
}

/** The link sweep: the subject's slot becomes an anchor to the href it sets. */
function becomesLink({ render, slot }: LinkSubject) {
	// `baseElement` is the document body, which holds the render container and
	// anything portalled out of it alike.
	const { baseElement } = renderUI(render(LINK_HREF))

	const anchor = getSlot(baseElement, slot)

	expect(anchor.tagName).toBe('A')

	expect(anchor).toHaveAttribute('href', LINK_HREF)
}

/** Renders `element` and reads the `data-size` its slot publishes. */
function publishedSize(element: ReactElement, slot: string) {
	// `baseElement` is the document body, so a portalled overlay is in reach.
	const { baseElement } = renderUI(element)

	return getSlot(baseElement, slot).getAttribute('data-size')
}

/** The density sweep, ambient leg: with no size, the subject takes the enclosing Density. */
function inheritsDensity({ render, slot }: DensitySubject) {
	expect(publishedSize(<Density scale={AMBIENT}>{render()}</Density>, slot)).toBe(AMBIENT)
}

/** The density sweep, explicit leg: a size prop wins over the enclosing Density. */
function explicitSizeWins({ render, slot }: DensitySubject) {
	expect(publishedSize(<Density scale={AMBIENT}>{render(EXPLICIT)}</Density>, slot)).toBe(EXPLICIT)
}

/** The density sweep, fallback leg: with no Density and no size, the subject is `md`. */
function fallsBackToMd({ render, slot }: DensitySubject) {
	expect(publishedSize(render(), slot)).toBe(FALLBACK)
}

/** The text-input sweep, ref leg: the ref reaches the editable element. */
function forwardsRef({ render, slot }: TextInputSubject) {
	let received: HTMLElement | null = null

	const { container } = renderUI(
		render({
			ref: (element) => {
				received = element
			},
		}),
	)

	expect(received).toBe(getSlot(container, slot))
}

/** The text-input sweep, placeholder leg: the placeholder reaches the editable element. */
function passesPlaceholder({ render, slot }: TextInputSubject) {
	const { container } = renderUI(render({ placeholder: PLACEHOLDER }))

	expect(getSlot(container, slot)).toHaveAttribute('placeholder', PLACEHOLDER)
}

/** The text-input sweep, disabled leg: `disabled` disables the editable element. */
function disablesInput({ render, slot }: TextInputSubject) {
	const { container } = renderUI(render({ disabled: true }))

	expect(getSlot(container, slot)).toBeDisabled()
}

describe('component pass-through', () => {
	for (const subject of passThrough) {
		it(`${subject.slot} passes through HTML attributes`, () => passesThrough(subject))
	}

	// A corpus that declared nothing would sweep nothing, and say so by passing.
	it('has subjects to sweep', () => {
		expect(passThrough).not.toHaveLength(0)
	})
})

describe('component skeletons', () => {
	for (const subject of skeletons) {
		it(`${subject.absentSlot} pairs with an explicit skeleton in loading trees`, () =>
			drawsSkeleton(subject))
	}

	it('has subjects to sweep', () => {
		expect(skeletons).not.toHaveLength(0)
	})
})

describe('component links', () => {
	for (const subject of links) {
		it(`${subject.slot} renders as a link when href is provided`, () => becomesLink(subject))
	}

	it('has subjects to sweep', () => {
		expect(links).not.toHaveLength(0)
	})
})

describe('component density', () => {
	for (const subject of densities) {
		it(`${subject.title} inherits its size from an ambient Density`, () => inheritsDensity(subject))

		it(`${subject.title} lets an explicit size win over an ambient Density`, () =>
			explicitSizeWins(subject))

		it(`${subject.title} falls back to md outside any Density`, () => fallsBackToMd(subject))
	}

	it('has subjects to sweep', () => {
		expect(densities).not.toHaveLength(0)
	})
})

describe('component text inputs', () => {
	for (const subject of textInputs) {
		it(`${subject.title} forwards its ref to the editable element`, () => forwardsRef(subject))

		it(`${subject.title} passes through placeholder`, () => passesPlaceholder(subject))

		it(`${subject.title} disables the editable element when disabled`, () => disablesInput(subject))
	}

	it('has subjects to sweep', () => {
		expect(textInputs).not.toHaveLength(0)
	})
})

/**
 * Teeth checks: each sweep's assertion must be able to fail, or a corpus that
 * quietly stopped declaring subjects would read as green.
 *
 * Each check runs the sweep's own body on a subject built to break it, and
 * expects the body to throw. A sweep assertion that grows weaker therefore
 * fails here too.
 */
describe('capability sweeps: teeth checks', () => {
	it('fails a component that drops the props it is given', () => {
		expect(() =>
			passesThrough({ render: () => <div data-slot="dropping" />, slot: 'dropping' }),
		).toThrow()
	})

	it('fails a silhouette that leaks the real component', () => {
		expect(() =>
			drawsSkeleton({
				element: (
					<div data-slot="leaked">
						<div data-slot="placeholder" />
					</div>
				),
				absentSlot: 'leaked',
			}),
		).toThrow()
	})

	it('fails a silhouette that draws nothing', () => {
		expect(() => drawsSkeleton({ element: <div />, absentSlot: 'absent' })).toThrow()
	})

	it('fails a silhouette that draws the wrong count', () => {
		expect(() =>
			drawsSkeleton({
				element: <div data-slot="placeholder" />,
				absentSlot: 'absent',
				placeholders: 2,
			}),
		).toThrow()
	})

	it('fails a subject that does not become an anchor', () => {
		expect(() =>
			becomesLink({ render: () => <span data-slot="not-a-link" />, slot: 'not-a-link' }),
		).toThrow()
	})

	it('fails a subject that ignores the ambient Density', () => {
		expect(() =>
			inheritsDensity({ render: () => <div data-slot="fixed" data-size="md" />, slot: 'fixed' }),
		).toThrow()
	})

	it('fails a subject that lets the ambient Density beat its size prop', () => {
		expect(() =>
			explicitSizeWins({
				render: () => <div data-slot="ambient-only" data-size={AMBIENT} />,
				slot: 'ambient-only',
			}),
		).toThrow()
	})

	it('fails a subject that falls back to a size other than md', () => {
		expect(() =>
			fallsBackToMd({ render: () => <div data-slot="large" data-size="lg" />, slot: 'large' }),
		).toThrow()
	})

	it('fails a text input that keeps its ref', () => {
		expect(() =>
			forwardsRef({ render: () => <input data-slot="unreffed" />, slot: 'unreffed' }),
		).toThrow()
	})

	it('fails a text input that drops its placeholder', () => {
		expect(() =>
			passesPlaceholder({ render: () => <input data-slot="bare" />, slot: 'bare' }),
		).toThrow()
	})

	it('fails a text input that stays enabled', () => {
		expect(() =>
			disablesInput({ render: () => <input data-slot="enabled" />, slot: 'enabled' }),
		).toThrow()
	})

	it('fails an anchor that does not carry the href it was given', () => {
		expect(() =>
			becomesLink({
				render: () => (
					<a href="/elsewhere" data-slot="elsewhere">
						Elsewhere
					</a>
				),
				slot: 'elsewhere',
			}),
		).toThrow()
	})
})
