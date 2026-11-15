// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { splitOverlayProps } from '../../primitives/panel/use-panel-surface'

describe('splitOverlayProps', () => {
	it('puts the overlay knobs in the overlay and the rest in the rest', () => {
		const container = null

		const [overlay, rest] = splitOverlayProps({
			modal: false,
			backdrop: true,
			dismissOnBackdrop: false,
			container,
			id: 'panel',
			'data-testid': 'x',
		})

		expect(overlay).toEqual({ modal: false, backdrop: true, dismissOnBackdrop: false, container })

		expect(rest).toEqual({ id: 'panel', 'data-testid': 'x' })
	})

	it('makes the panel modal unless the consumer sets false', () => {
		expect(splitOverlayProps({})[0].modal).toBe(true)

		expect(splitOverlayProps({ modal: undefined })[0].modal).toBe(true)
	})
})
