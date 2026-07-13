# useControllable

Manages controlled / uncontrolled value state with a unified setter: pass `value` to control it, `defaultValue` to seed the uncontrolled case, and `onValueChange` to observe every change.

```tsx
import { useControllable } from 'ui/hooks'
```

## Uncontrolled

With only a `defaultValue`, the hook owns the state; the setter accepts a next value or a functional updater.

```tsx preview title="Uncontrolled toggle"
import { Button } from 'ui/button'
import { useControllable } from 'ui/hooks'

export default function Uncontrolled() {
	const [on, setOn] = useControllable<boolean>({ defaultValue: false })

	return (
		<Button variant={on ? 'solid' : 'outline'} onClick={() => setOn((current) => !current)}>
			{on ? 'On' : 'Off'}
		</Button>
	)
}
```

## Controlled

Pass `value` and `onValueChange` to drive the hook from outside; it never writes its own shadow state while controlled.

```tsx preview title="Controlled input"
import { useState } from 'react'
import { Input } from 'ui/input'
import { useControllable } from 'ui/hooks'

export default function Controlled() {
	const [value, setValue] = useState('')

	const [current, setCurrent] = useControllable<string>({
		value,
		onValueChange: (next) => setValue(next ?? ''),
	})

	return <Input value={current ?? ''} onChange={(event) => setCurrent(event.target.value)} />
}
```
