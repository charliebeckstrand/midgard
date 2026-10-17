/**
 * True when a normalized issue list is present and not empty. It is the one
 * definition of an invalid field. Each bindable control and each form engine
 * reads it.
 *
 * @internal
 */
export function hasIssues(issues: string[] | undefined): boolean {
	return issues !== undefined && issues.length > 0
}
