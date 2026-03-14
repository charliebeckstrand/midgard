# Preferences

## Code ordering

- Place `interface` and `type` declarations above `const` and function declarations when possible. If a type depends on a `const` (e.g., `typeof myConst`), the `const` must appear first.

## Line breaks / vertical spacing

- Use blank lines to separate **unrelated** statements or logical groups. If two lines serve different purposes, put a blank line between them.
- Lines that are **closely related** (same concept, same API, sequential setup) can stay together with no blank line.
- Examples:

  ```ts
  // Blank line after declaration, before the if block (different concerns)
  let authenticated = false

  if (sessionResponse.ok) {
    const data = (await sessionResponse.json()) as { authenticated?: boolean }

    authenticated = data.authenticated === true
  }

  // Blank line between unrelated declarations
  const { pathname } = request.nextUrl

  const isGuestRoute = guestRoutes.some((r) => pathname.startsWith(r))

  // Related lines stay together (same API, sequential setup)
  process.stdin.resume()
  process.stdin.setEncoding('utf-8')
  ```
