import type { JsonValue } from '../../../../components/json-tree/types'
import type { EventSource } from '../types'
import { nextBatch, observe } from './dom'

/** A resource timing as JSON, with each time in whole milliseconds. */
function timingOf(entry: PerformanceResourceTiming): JsonValue {
	const fields: Record<string, unknown> = entry.toJSON()

	return Object.fromEntries(
		Object.entries(fields).map(([key, value]) => [
			key,
			typeof value === 'number' ? Math.round(value) : value,
		]),
	) as JsonValue
}

/**
 * Each script and each link that the page loads, at the start time of its
 * load: the file name, the duration, `cache` for a load from the HTTP cache,
 * and the status of a load that fails. The detail holds the resource timing.
 * The loads of one pass are one batch: a load that starts before each load of
 * the pass ends is a part of the pass.
 */
export const network: EventSource = (note) => {
	let pass = ''

	let passEnd = Number.NEGATIVE_INFINITY

	return observe(['resource'], (entry) => {
		const resource = entry as PerformanceResourceTiming

		if (resource.initiatorType !== 'script' && resource.initiatorType !== 'link') return

		if (resource.startTime > passEnd) pass = nextBatch()

		passEnd = Math.max(passEnd, resource.responseEnd)

		// A load from the cache transfers no bytes, but has a body.
		const cache = resource.transferSize === 0 && resource.decodedBodySize > 0 ? ' cache' : ''

		// Not each browser gives the status.
		const failed = resource.responseStatus >= 400 ? ` failed ${resource.responseStatus}` : ''

		const file = new URL(resource.name).pathname.split('/').at(-1)

		note({
			kind: 'network',
			text: `${file} ${Math.round(resource.duration)} ms${cache}${failed}`,
			detail: timingOf(resource),
			time: resource.startTime,
			batch: pass,
		})
	})
}
