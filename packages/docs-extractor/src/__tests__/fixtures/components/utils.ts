/** Join label segments with a middle dot. */
export function formatLabel(parts: string[]): string {
	return parts.join(' · ')
}
