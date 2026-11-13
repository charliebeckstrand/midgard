import { words } from './words.ts'

// The tasks of the demos (CONVENTIONS.md §13.8): the work of a small product
// team, with a status, a due day, an estimate, and a budget.

/** The status of a task. */
export const taskStatuses = words('task-status', {
	todo: 'To do',
	inProgress: 'In progress',
	done: 'Done',
})

export type TaskStatus = keyof typeof taskStatuses

export type Task = {
	id: number
	title: string
	status: TaskStatus
	due: Date
	/** The estimate of the work, in hours. */
	estimate: number
	/** The budget of the task, in US dollars. */
	budget: number
	description: string
}

export const tasks: readonly Task[] = [
	{
		id: 1,
		title: 'Fix sign-in redirect',
		status: 'inProgress',
		due: new Date(2026, 0, 15),
		estimate: 3,
		budget: 1200,
		description: 'Users land on the home page after sign-in instead of the page they asked for.',
	},
	{
		id: 2,
		title: 'Add dark mode',
		status: 'todo',
		due: new Date(2026, 2, 1),
		estimate: 8,
		budget: 800,
		description: 'Follow the system setting.\nAdd a toggle in the account menu.',
	},
	{
		id: 3,
		title: 'Upgrade dependencies',
		status: 'done',
		due: new Date(2026, 1, 10),
		estimate: 13,
		budget: 600,
		description: 'Move each package to its latest minor version.',
	},
	{
		id: 4,
		title: 'Write API docs',
		status: 'done',
		due: new Date(2026, 3, 20),
		estimate: 5,
		budget: 500,
		description: 'Give each endpoint an example request.',
	},
]
