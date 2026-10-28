import { useState } from 'react'
import { Button } from 'ui/button'
import { useToast } from 'ui/toast'

export default function MaxToasts() {
	const { toast } = useToast()

	const [count, setCount] = useState(0)

	function show() {
		const next = count + 1

		setCount(next)

		toast({ title: `Notification ${next}`, description: 'Ravi Shah replied to your comment.' })
	}

	return <Button onClick={show}>Show toast</Button>
}
