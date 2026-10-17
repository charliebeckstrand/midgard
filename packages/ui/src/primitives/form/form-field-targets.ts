import { createEmitter } from '../../utilities'

/**
 * The control ids of the fields of one form, by field name. A form-bound
 * `Message` registers the id of its control. A `FormErrorSummary` links each
 * invalid field to that id.
 *
 * @internal
 */
export type FormFieldTargets = {
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => Readonly<Record<string, string>>
	/** Registers the control id of a field, and returns the function that removes it. */
	register: (name: string, id: string) => () => void
}

/**
 * Makes the registry of control ids for one form. Each change gives a new
 * snapshot object, so a subscriber renders again only on a change.
 *
 * @internal
 */
export function createFormFieldTargets(): FormFieldTargets {
	let targets: Readonly<Record<string, string>> = {}

	const { subscribe, emit } = createEmitter()

	return {
		subscribe,
		getSnapshot: () => targets,
		register: (name, id) => {
			if (targets[name] !== id) {
				targets = { ...targets, [name]: id }

				emit()
			}

			return () => {
				// A later registration of the same name owns the entry.
				if (targets[name] !== id) return

				const next = { ...targets }

				delete next[name]

				targets = next

				emit()
			}
		},
	}
}
