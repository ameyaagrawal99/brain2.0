# Claude Code — Project Instructions

## TypeScript: Narrowing arrays with nullable fields

**Never** use `.map(...).filter((x): x is T => !!x.field)` when the mapped object
contains a field typed as `T | undefined`. TypeScript 5.x requires the type predicate
target (`T`) to be assignable to the parameter type, which fails when the mapped shape
has `field: T | undefined`.

**Always** use `flatMap` with an explicit guard instead:

```ts
// ❌ Fails: type predicate's type must be assignable to its parameter's type
const results: Foo[] = items
  .map((x) => ({ value: map.get(x.key), ... }))   // value: Bar | undefined
  .filter((x): x is Foo => !!x.value)              // TS error

// ✅ Correct: flatMap with explicit null check
const results: Foo[] = items.flatMap((x) => {
  const value = map.get(x.key)
  if (!value) return []
  return [{ value, ... }]
})
```

This applies everywhere a `Map.get()` or other nullable lookup is placed inside
`.map()` before a narrowing `.filter()`.

## Lucide icon props: never pass `title` directly

Lucide React icons (`<Network>`, `<ExternalLink>`, `<Link2>`, etc.) do **not** accept
a `title` prop — their TypeScript types only allow `LucideProps` (className, size,
strokeWidth, etc.). Passing `title` causes a TS error:

```
Type '{ className: string; title: string; }' is not assignable to type
'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
```

**Always** wrap the icon in a `<span title="...">` for browser tooltips:

```tsx
// ❌ Fails
<Network className="w-4 h-4" title="Show connections" />

// ✅ Correct
<span title="Show connections">
  <Network className="w-4 h-4" />
</span>
```

## Build verification

Before committing, always run:
```
npx tsc --noEmit --skipLibCheck
```
and confirm **zero errors** in changed files. The CI deploy step runs the TypeScript
compiler and will fail if type errors exist in application source files.
