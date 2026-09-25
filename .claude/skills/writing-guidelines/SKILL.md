---
name: writing-guidelines
description: Review docs/prose for Writing Guidelines compliance. Use when asked to "review my docs", "check writing style", "audit prose", "review docs voice and tone", or "check this page against the writing handbook".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Writing Guidelines

Review files for compliance with Writing Guidelines.

## How It Works

1. Fetch the pinned guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Fetch the guidelines at the pinned commit before each review:

```
https://raw.githubusercontent.com/vercel-labs/writing-guidelines/83e2316b034cf572400513538e4e4da01c4cc742/command.md
```

Use WebFetch to retrieve the rules. The fetched content contains all the rules and output format instructions.

The URL names a commit, not a branch, so a push to the upstream repository cannot change these instructions. To take a newer version, read the upstream diff, then update the commit in the URL.

Where the fetched guidelines and [`STE.md`](../../../STE.md) disagree, `STE.md` wins: it is the controlled language of this repository.

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
