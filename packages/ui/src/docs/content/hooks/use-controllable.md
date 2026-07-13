# useControllable

The hook behind the design system's controlled / uncontrolled pattern.

It lets a component accept an optional controlled value from its parent while still working when that value is omitted — the parent drives it when it wants to, and the component keeps its own state when it doesn't. Every input, toggle, and disclosure in the system is built on this one contract, so they all handle both cases the same way. Reach for it when you're building a component that needs to offer the same choice.
