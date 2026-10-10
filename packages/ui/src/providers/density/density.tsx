import type { ReactNode } from 'react'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { type DensityLevel, levelToStep } from './context'

/** Props for {@link DensityProvider}: the friendly `density` level to broadcast, and `children`. */
export type DensityProviderProps = {
	/**
	 * The density level of the region. Omit it to open no scope: the region
	 * then keeps the step of its nearest density scope.
	 *
	 * @defaultValue `'snug'`, or the level of the nearest density scope.
	 */
	density?: DensityLevel
	children: ReactNode
}

/**
 * Opens a density scope for a region at a friendly level (`compact`, `snug`, or
 * `loose`). The wrapper element writes the step of the level to
 * `data-density`, so each stepped class in the region takes that step in CSS.
 * An `<Input>` in `<DensityProvider density="compact">` is `sm` with no change
 * to its props.
 *
 * The provider also opens the `Density` context at the same step. A `Portal`
 * reads it, so a panel that the region opens keeps the step. The few client
 * components that need the step as a JS value, such as Grid and the charts,
 * read it too.
 *
 * @remarks
 * The root element is the scope of the app. `AppearanceScript` and
 * `AppearanceProvider` write the stored step there, so an app needs no
 * provider. Use one for a region that differs from the app.
 */
export function DensityProvider({ density, children }: DensityProviderProps) {
	const step = density && levelToStep[density]

	return (
		<PolymorphicStatic as="span" data-slot="density" density={step} className="contents">
			{children}
		</PolymorphicStatic>
	)
}
