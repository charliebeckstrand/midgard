/**
 * The built-in aggregation names. The pivot table and the grid both take them:
 * `PivotAggregation` and `GridAggFuncName` are aliases of this union.
 */
export type Aggregation = 'sum' | 'avg' | 'min' | 'max' | 'count'

/**
 * Reduces `values` by `op`. The one numeric reducer behind the pivot table and
 * the grid aggregate rows.
 *
 * @remarks
 * `count` is not an operation here, and `values` must not be empty. Each caller
 * keeps its own count and empty-set rules, which differ on purpose: the pivot
 * table counts its numeric values and shows `0` for an empty set, and the grid
 * counts its rows and shows a blank cell.
 *
 * Min and max reduce by `<` and `>`, not by `Math.min(...values)` and
 * `Math.max(...values)`. Spreading a large value set as call arguments
 * overflows the stack on a grand total over many thousands of rows. The
 * comparison also keeps the first of an equal pair, so a `-0` among the values
 * reads as it did before.
 *
 * @param values - The numbers to reduce. Must not be empty.
 * @param op - The aggregation, other than `count`.
 * @returns The sum, the mean, the minimum, or the maximum of `values`.
 */
export function reduceNumbers(
	values: readonly number[],
	op: Exclude<Aggregation, 'count'>,
): number {
	switch (op) {
		case 'sum':
			return values.reduce((sum, value) => sum + value, 0)
		case 'avg':
			return values.reduce((sum, value) => sum + value, 0) / values.length
		case 'min':
			return values.reduce((min, value) => (value < min ? value : min))
		case 'max':
			return values.reduce((max, value) => (value > max ? value : max))
	}
}
