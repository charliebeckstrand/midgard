import { describe, expect, it, vi } from 'vitest'
import { useFormFiltersName } from '../../modules/form/form-filters/context'
import { useGridHighlight, useGridResizing, useGridSettle } from '../../modules/grid/context'
import { useGridNewRowSession } from '../../modules/grid/grid-editing-context'
import { useGridGroupByButton } from '../../modules/grid/grid-group-by-button'
import { useGridNavContext } from '../../modules/grid/use-grid-navigation'
import { useMapPointed, useMapZoomView } from '../../modules/map/context'
import { renderUI } from '../helpers'

// The filter bar, the map frame, and the grid provide these contexts to each
// reader. A reader with no provider is a wrong mount, so it throws and does not
// draw with a stand-in value.
const READERS = [
	['useFormFiltersName', useFormFiltersName, 'FormFiltersName'],
	['useMapPointed', () => useMapPointed(() => null), 'MapPointedMark'],
	['useMapZoomView', useMapZoomView, 'MapZoom'],
	['useGridSettle', useGridSettle, 'GridSettle'],
	['useGridResizing', useGridResizing, 'GridSettle'],
	['useGridHighlight', useGridHighlight, 'GridHighlight'],
	['useGridNavContext', useGridNavContext, 'GridNav'],
	['useGridGroupByButton', useGridGroupByButton, 'GridGroupByButton'],
	['useGridNewRowSession', useGridNewRowSession, 'GridNewRow'],
] as const

describe('required module contexts', () => {
	it.each(READERS)('%s throws with no provider', (_, read, name) => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		function Reader() {
			read()

			return null
		}

		expect(() => renderUI(<Reader />)).toThrow(`must be used within <${name}>`)
	})
})
