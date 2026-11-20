import { describe, expect, it } from 'vitest'
import { anchorFollowsTransforms, inTransformedSubtree } from '../../utilities/anchor-transforms'
import { attach } from '../helpers'

/**
 * The two reads that decide whether a panel anchors to a reference under a
 * transform. An engine that resolves the anchor without the transform keeps
 * the `transform` position for such a reference (`useFloatingPanel`). The
 * suite runs in Chromium, which includes the transform, as the specification
 * does.
 */
describe('anchor transforms (real browser)', () => {
	it('finds that the engine includes the transform of the anchor', () => {
		expect(anchorFollowsTransforms()).toBe(true)

		// The probe removes its boxes.
		expect(document.querySelector('[style*="--floating-transform-probe"]')).toBeNull()
	})

	it.each([
		['transform', 'translateX(10px)'],
		['translate', '10px 0'],
		['scale', '2'],
		['rotate', '10deg'],
	])('finds a %s on an ancestor', (property, value) => {
		const ancestor = attach(document.createElement('div'))

		ancestor.style.setProperty(property, value)

		const child = document.createElement('span')

		ancestor.append(document.createElement('div'))

		ancestor.lastElementChild?.append(child)

		expect(inTransformedSubtree(child)).toBe(true)
	})

	it('finds a transform on the element itself', () => {
		const element = attach(document.createElement('button'))

		element.style.transform = 'scale(1.5)'

		expect(inTransformedSubtree(element)).toBe(true)
	})

	it('finds a transform above a shadow root and above a slot', () => {
		const outer = attach(document.createElement('div'))

		outer.style.transform = 'translateY(4px)'

		const host = document.createElement('div')

		outer.append(host)

		const shadow = host.attachShadow({ mode: 'open' })

		const inShadow = document.createElement('button')

		shadow.append(inShadow)

		expect(inTransformedSubtree(inShadow)).toBe(true)

		// A slot in a transformed box of the shadow tree, and a slotted child of
		// a host with no transform of its own.
		const plainHost = attach(document.createElement('div'))

		const plainShadow = plainHost.attachShadow({ mode: 'open' })

		const frame = document.createElement('div')

		frame.style.transform = 'scale(2)'

		frame.append(document.createElement('slot'))

		plainShadow.append(frame)

		const slotted = document.createElement('button')

		plainHost.append(slotted)

		expect(inTransformedSubtree(slotted)).toBe(true)
	})

	it('finds no transform on a plain tree', () => {
		const ancestor = attach(document.createElement('div'))

		const child = document.createElement('button')

		ancestor.append(child)

		expect(inTransformedSubtree(child)).toBe(false)
	})
})
