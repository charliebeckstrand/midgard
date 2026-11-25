import { seriesGroupClass } from '../../modules/chart/engine/chart-series'
import { k as map } from '../../recipes/kata/map'
import { classNames } from './class-stops'

/**
 * Reads the one class that a receded mark adds to a lit mark. A test reads the
 * recede through this class, never through a written token. Thus, when the
 * source changes the token, the test moves with it, and a check that a mark is
 * lit does not pass because it looks for an old token.
 *
 * @throws If the receded classes add no class or more than one class to the lit classes.
 */
function recedeClass(source: string, receded: unknown, lit: unknown): string {
	const litClasses = new Set(classNames([lit]))

	const added = classNames([receded]).filter((name) => !litClasses.has(name))

	if (added.length !== 1 || added[0] === undefined) {
		throw new Error(`expected one recede class from ${source}, got ${JSON.stringify(added)}`)
	}

	return added[0]
}

/** The class of a receded chart mark, from `seriesGroupClass`. */
export const CHART_RECEDE = recedeClass(
	'seriesGroupClass',
	seriesGroupClass(true),
	seriesGroupClass(false),
)

/** The class of a receded map mark group, from `group` of the map recipe. */
export const MAP_RECEDE = recedeClass('the map recipe group', map.group(true), map.group(false))

/** The recede classes of the chart and the map, each once. */
const recedeClasses = [...new Set([CHART_RECEDE, MAP_RECEDE])]

/**
 * A selector for a receded chart mark or map mark group: an element that
 * carries {@link CHART_RECEDE} or {@link MAP_RECEDE}.
 */
export const RECEDE_SELECTOR = `:is(${recedeClasses.map((name) => `[class~="${name}"]`).join(', ')})`
