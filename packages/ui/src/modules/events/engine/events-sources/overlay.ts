import { subscribeOverlaySignal } from '../../../../primitives/overlay/overlay-signal'
import { viewport } from '../events-probes'
import type { EventSource } from '../types'

/** Each overlay that opens, with the reading of the viewport. */
export const overlay: EventSource = (note) =>
	subscribeOverlaySignal(() => note({ kind: 'overlay', text: 'overlay opens', detail: viewport() }))
