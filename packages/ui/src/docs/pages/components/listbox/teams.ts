export const teams = [
	{ id: 'design', name: 'Design' },
	{ id: 'engineering', name: 'Engineering' },
	{ id: 'marketing', name: 'Marketing' },
	{ id: 'sales', name: 'Sales' },
	{ id: 'support', name: 'Support' },
]

export function teamName(id: string) {
	return teams.find((team) => team.id === id)?.name ?? id
}
