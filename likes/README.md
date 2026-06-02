# likes

Namespace-scoped like counter — a persistent server API and a plug-and-play web component.

## Web component

```html
<!-- 1. Import -->
<script type="module" src="https://weolopez.com/likes/like-button.js"></script>

<!-- 2. Use -->
<like-button namespace="blog/my-post"></like-button>
```

Each `namespace` is an independent counter stored in the server database. Likes accumulate across all visitors and persist across server restarts.

### Attributes

| Attribute   | Default        | Description                                      |
|-------------|----------------|--------------------------------------------------|
| `namespace` | `default`      | Unique key for this counter (e.g. `blog/post-1`) |
| `api-base`  | `/likes/api`   | Base URL of the API (set for cross-origin use)   |

### CSS custom properties

| Property      | Default   | Description          |
|---------------|-----------|----------------------|
| `--like-color` | `#0052B4` | Button gradient color |
| `--like-size`  | `64px`    | Button diameter       |

### Cross-origin usage

```html
<like-button
  namespace="my-site/hero"
  api-base="https://weolopez.com/likes/api"
  style="--like-color: #7c3aed; --like-size: 80px">
</like-button>
```

### CSS parts

The component exposes [CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) for deeper styling:

```css
like-button::part(button) { border-radius: 12px; }
like-button::part(count)  { font-size: 2rem; }
like-button::part(label)  { display: none; }
```

---

## API

Base path: `/likes/api`  
All endpoints accept a `?ns=<namespace>` query parameter. Namespaces are alphanumeric plus `-._/`, max 128 characters.

### `GET /likes/api/count?ns=<namespace>`

Returns the current like count for a namespace.

```json
{ "count": 42, "namespace": "blog/my-post" }
```

### `POST /likes/api/like?ns=<namespace>`

Increments the count by one and returns the new value.

```json
{ "count": 43, "namespace": "blog/my-post" }
```

### `POST /likes/api/reset?ns=<namespace>`

Resets the count to zero.

```json
{ "count": 0, "namespace": "blog/my-post" }
```

---

## Files

```
likes/
├── api.ts          — Deno server handler (Deno KV persistence)
├── like-button.js  — <like-button> web component
├── index.html      — Live demo with multiple namespaces
└── likes.db        — Deno KV database (SQLite, auto-created)
```

## Storage

Counts are stored in a [Deno KV](https://deno.com/kv) database at `likes/likes.db` under the key `["likes", namespace]`. The database is created automatically on first run.
