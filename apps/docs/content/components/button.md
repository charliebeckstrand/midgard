---
usage:
  domain: commerce
---

# Button

Polymorphic action control: renders a `<button>`, or an anchor when `href` is set, with `variant`, `color`, and `size` axes, a `loading` state, and `prefix`/`suffix` adornments.

```tsx
import { Button } from 'ui/button'
```

## Variants

Five visual weights, from the filled default down to the chromeless `bare`.

```tsx preview title="Variants"
import { Button } from 'ui/button'

export default function Variants() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button>Solid</Button>
			<Button variant="soft">Soft</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="plain">Plain</Button>
			<Button variant="bare">Bare</Button>
		</div>
	)
}
```

## Loading

While `loading`, the label yields to a spinner and the control stops accepting presses.

```tsx preview title="Loading"
import { useState } from 'react'
import { Button } from 'ui/button'

export default function Loading() {
	const [loading, setLoading] = useState(false)

	return (
		<Button loading={loading} onClick={() => setLoading((current) => !current)}>
			{loading ? 'Working…' : 'Start'}
		</Button>
	)
}
```
