export const teams = [
	{ id: 'design', label: 'Design' },
	{ id: 'engineering', label: 'Engineering' },
	{ id: 'marketing', label: 'Marketing' },
	{ id: 'sales', label: 'Sales' },
	{ id: 'support', label: 'Support' },
]

export function teamName(id: string) {
	return teams.find((team) => team.id === id)?.label ?? id
}
