import type {
	GridColumnManagerConfig,
	GridColumnOrder,
	GridPinning,
	GridPreferences,
} from '../../grid-data-types'
import type { GridColumnSizing } from '../../types'

/** Whether a consumer already bound a dimension's initial state (so a `preferences` seed must not override it). @internal */
function isBound(config: { value?: unknown; defaultValue?: unknown } | undefined): boolean {
	return config?.value !== undefined || config?.defaultValue !== undefined
}

/** Seeds {@link GridColumnOrder.defaultValue} from `preferences.order`, skipping an empty order (which would defeat the declaration-order fallback). @internal */
export function seedColumnOrder(
	config: GridColumnOrder | undefined,
	preferences: GridPreferences | undefined,
): GridColumnOrder | undefined {
	const order = preferences?.order

	if (!order?.length || isBound(config)) return config

	return { ...config, defaultValue: order }
}

/** Seeds {@link GridPinning.defaultValue} from `preferences.pinning`. @internal */
export function seedPinning(
	config: GridPinning | undefined,
	preferences: GridPreferences | undefined,
): GridPinning | undefined {
	const pinning = preferences?.pinning

	if (pinning === undefined || isBound(config)) return config

	return { ...config, defaultValue: pinning }
}

/** Seeds {@link GridColumnSizing.defaultValue} from `preferences.columnSizing`. @internal */
export function seedColumnSizing(
	config: GridColumnSizing | undefined,
	preferences: GridPreferences | undefined,
): GridColumnSizing | undefined {
	const sizing = preferences?.columnSizing

	if (sizing === undefined || isBound(config)) return config

	return { ...config, defaultValue: sizing }
}

/**
 * Seeds {@link GridColumnManagerConfig.defaultHidden} from `preferences.hidden`,
 * unless the consumer bound visibility. Flattens the `columnManager={false}` off
 * switch to `undefined` on the way through — a manager that isn't there carries
 * no bindings to seed.
 *
 * @internal
 */
export function seedColumnManager(
	config: GridColumnManagerConfig | false | undefined,
	preferences: GridPreferences | undefined,
): GridColumnManagerConfig | undefined {
	const manager = config || undefined

	const hidden = preferences?.hidden

	if (
		hidden === undefined ||
		manager?.hidden !== undefined ||
		manager?.defaultHidden !== undefined
	) {
		return manager
	}

	return { ...manager, defaultHidden: new Set(hidden) }
}
