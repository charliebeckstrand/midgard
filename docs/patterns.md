# Reusable Code Patterns

Recurring idioms specific to this project. Extract here when a pattern appears in 2+ places.

## asChild with React.cloneElement

Used in `packages/ui` Sheet (trigger, close) and any future component that needs to render a user-supplied element instead of its default wrapper.

**When to use:** When a component accepts an `asChild` prop and must merge its own event handlers / data attributes onto a consumer-provided child element.

**Why not object spread:** Spreading `{ ...wrapperProps, ...child.props }` silently drops the child's `ref` and lets the last-spread handler clobber earlier ones. `cloneElement` preserves refs and lets you compose handlers explicitly.

```tsx
import React from 'react'

interface TriggerProps {
  asChild?: boolean
  children: React.ReactNode
  onClick?: React.MouseEventHandler
  // ...other props
}

function Trigger({ asChild, children, onClick, ...rest }: TriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ...rest,
      onClick: (e: React.MouseEvent) => {
        // compose handlers — call both child's and wrapper's
        ;(children as React.ReactElement<{ onClick?: React.MouseEventHandler }>).props.onClick?.(e)
        onClick?.(e)
      },
    })
  }
  return <button onClick={onClick} {...rest}>{children}</button>
}
```

Reference implementations: `packages/ui/src/components/sheet/trigger.tsx`, `packages/ui/src/components/sheet/close.tsx`.

## motion.span layoutId for animated active indicator

Used in `packages/ui` Tabs component. A `motion.span` with a shared `layoutId` automatically animates between positions when the active tab changes, creating a smooth sliding indicator effect.

**When to use:** When a set of items has an "active" state indicator (underline, highlight, pill) that should animate between items on selection change.

```tsx
import { motion } from 'motion/react'

function Tab({ isActive, layoutId, children }: { isActive: boolean; layoutId: string; children: React.ReactNode }) {
  return (
    <button>
      {children}
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-x-0 bottom-0 h-0.5 bg-current"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        />
      )}
    </button>
  )
}
```

The `layoutId` must be unique per Tabs instance to avoid cross-instance animation. The Tabs component generates one automatically and allows override via props.

Reference implementation: `packages/ui/src/components/tabs/tabs.tsx`.
