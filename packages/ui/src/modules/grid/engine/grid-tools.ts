import type { GridToolbarButton, GridToolSurfaces } from '../types'

/**
 * A tool's {@link GridToolSurfaces}, resolved against the defaults. `toolbar`
 * says whether the button renders, and `button` gives its look.
 *
 * @internal
 */
export type ResolvedToolSurfaces = {
	toolbar: boolean
	contextMenu: boolean
	button: Required<GridToolbarButton>
}

/** The look of a `toolbar: true` button: the icon and the label, with no tooltip. @internal */
const LABELED_BUTTON: Required<GridToolbarButton> = { iconOnly: false, tooltip: false }

/** The {@link GridToolSurfaces} defaults, in one place for every tool that takes the pair. @internal */
export const DEFAULT_SURFACES: ResolvedToolSurfaces = {
	toolbar: false,
	contextMenu: true,
	button: LABELED_BUTTON,
}

/** A tool that is off entirely: neither surface offers it. @internal */
export const SURFACES_OFF: ResolvedToolSurfaces = {
	toolbar: false,
	contextMenu: false,
	button: LABELED_BUTTON,
}

/**
 * Resolves a tool's {@link GridToolSurfaces} against the shared defaults: the
 * right-click menus carry the tool, the toolbar button is opt-in. The single
 * reading of that policy: export and the column manager both land here, so the
 * two can't drift. The object form of `toolbar` renders the button, and its
 * fields set the look.
 *
 * @param surfaces - The tool's config, or `undefined` for an unconfigured tool.
 * @internal
 */
export function resolveToolSurfaces(surfaces: GridToolSurfaces | undefined): ResolvedToolSurfaces {
	const toolbar = surfaces?.toolbar ?? DEFAULT_SURFACES.toolbar

	return {
		toolbar: toolbar !== false,
		contextMenu: surfaces?.contextMenu ?? DEFAULT_SURFACES.contextMenu,
		button:
			typeof toolbar === 'object'
				? { iconOnly: toolbar.iconOnly ?? false, tooltip: toolbar.tooltip ?? false }
				: LABELED_BUTTON,
	}
}
