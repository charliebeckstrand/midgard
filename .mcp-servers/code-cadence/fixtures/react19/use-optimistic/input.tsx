import { useState } from 'react'

type Todo = { id: number; text: string }

export function TodoList({ initial }: { initial: Todo[] }) {
	const [todos, setTodos] = useState<Todo[]>(initial)

	const addTodo = async (text: string) => {
		const previous = todos

		try {
			setTodos([...todos, { id: Date.now(), text }])

			await fetch('/api/todos', { method: 'POST', body: JSON.stringify({ text }) })
		} catch {
			setTodos(previous)
		}
	}

	return (
		<ul>
			{todos.map((todo) => (
				<li key={todo.id}>{todo.text}</li>
			))}
		</ul>
	)
}
