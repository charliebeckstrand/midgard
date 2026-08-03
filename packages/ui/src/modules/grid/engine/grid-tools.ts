import type { GridToolSurfaces } from '../types'

/** The {@link GridToolSurfaces} defaults, in one place for every tool that takes the pair. @internal */
export const DEFAULT_SURFACES: Required<GridToolSurfaces> = { toolbar: false, contextMenu: true }

/** A tool that is off entirely: neither surface offers it. @internal */
export const SURFACES_OFF: Required<GridToolSurfaces> = { toolbar: false, contextMenu: false }

/**
 * Resolves a tool's {@link GridToolSurfaces} against the shared defaults — the
 * right-click menus carry the tool, the toolbar button is opt-in. The single
 * reading of that policy: export and the column manager both land here, so the
 * two can't drift.
 *
 * @param surfaces - The tool's config, or `undefined` for an unconfigured tool.
 * @internal
 */
export function resolveToolSurfaces(
	surfaces: GridToolSurfaces | undefined,
): Required<GridToolSurfaces> {
	return {
		toolbar: surfaces?.toolbar ?? DEFAULT_SURFACES.toolbar,
		contextMenu: surfaces?.contextMenu ?? DEFAULT_SURFACES.contextMenu,
	}
}
