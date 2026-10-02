/**
 * Kokkaku skeleton: description list. One term line and one details line per
 * pair. The pair count comes from the composing skeleton.
 *
 * Each line has the line height of the text of the list at the step of the
 * nearest density scope: `h-5` at `md`, for the `sm` text. The list projects
 * the cell padding onto the skeleton cells, as it does onto the real cells. The widths are defaults, and the lines do not go wider than the cell.
 *
 * Layer: kiso · Concern: skeleton form · Unit: description-list
 */

export const descriptionList = {
	term: 'density-h-[4,5,6] w-24 max-w-full',
	details: 'density-h-[4,5,6] w-48 max-w-full',
} as const
