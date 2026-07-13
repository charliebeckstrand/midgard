# useControllable

The hook behind the design system's controlled / uncontrolled pattern.

## Overview

It lets a component accept an optional controlled value from its parent while still working when that value is omitted — the parent drives it when it wants to, and the component keeps its own state when it doesn't. Every input, toggle, and disclosure in the system is built on this one contract.

## Usage

Reach for it when you're building a component that needs to offer the same choice: expose an optional value with a change callback, and let the hook reconcile the controlled and uncontrolled cases so they behave identically.
