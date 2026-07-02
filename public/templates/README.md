# Template cover images

Naming convention: `public/templates/<template.id>.<ext>`, where `<template.id>`
is the `id` field of that template's entry in `src/lib/systemWorkflows.ts`.

For "AI Racing Car Generator" (`id: "ai-racing-car-generator"`) that's:

```
public/templates/ai-racing-car-generator.svg
```

`ai-racing-car-generator.svg` right now is a generated placeholder, not a real
screenshot. To replace it with a real cover image, save your image under the
same name (swap the extension if it's a `.png`/`.jpg`, e.g.
`ai-racing-car-generator.png`) and update that template's `coverImageUrl` in
`src/lib/systemWorkflows.ts` to match the new filename/extension.

Adding a new template later: add its entry to `SYSTEM_WORKFLOWS` in
`src/lib/systemWorkflows.ts`, then drop its cover image here as
`public/templates/<new-id>.<ext>`.
