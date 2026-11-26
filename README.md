# TMPD achievement journal

A standalone, responsive checklist for all 157 supplied DayZ achievements in nine categories. “Admin photos” lists “All FOG Admins” first, followed by the other photos alphabetically. “Eat it all” contains five subcategories. Uses the supplied artwork, plain HTML/CSS/JavaScript, and browser `localStorage`. There are no dependencies, external requests, accounts, or build steps.

## Run

Open `index.html` in a browser. Keep it alongside `styles.css`, `achievements.js`, `app.js`, the banner/background PNGs, and the `icons/` directory.

For a consistent storage address, serve the directory with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. You can also upload the same files to any static web host. The icon sheet is the original artwork reference; individual category images are used in the interface.

## Using the journal

- Select a category and check off completed achievements.
- Search matches names, categories, and food subcategories across the entire journal. Press `/` to focus search.
- Filter by all, remaining, or completed achievements.
- Export a JSON backup to keep a copy or move progress between browsers/devices. Import validates the file and asks before replacing progress.
- Reset asks for confirmation. Escape cancels dialogs.

Progress is personal to the browser profile and address (origin). It does not sync with the server or an account. Private browsing, clearing site data, changing the address/port, or moving a directly opened file can lose access to saved progress. Browser handling of `localStorage` for `file://` pages varies; use a static server for predictable persistence. Export regular backups. When storage is blocked or full, the checklist works in memory and displays a warning to export before closing. Unreadable existing data is left untouched until an explicit import or reset.

## Editing achievements

Update `achievements.js`. Every achievement has an explicit, permanent ID separate from its display name:

```js
{id: 'ach-001', name: 'Albright'}
```

Correct spelling or rename an achievement by editing only `name`. Reordering items or moving an item to another category/subcategory also preserves progress because its ID stays the same. Never change an existing ID or reuse a deleted item's ID for something else. Give new achievements new, unique IDs; the next available ID is noted at the top of `achievements.js`. Counts are calculated from the data.

Completed IDs for items absent from the current checklist are preserved in saves and backups, but do not count toward current totals. If the same ID is added back later, its checked state returns. A single absent item no longer invalidates the entire save.

`localStorage` key: `tmpd.achievements.v2`. Saved data and backup JSON share the format:

```json
{
  "app": "tmpd-achievements",
  "version": 2,
  "updatedAt": "2026-11-23T12:00:00.000Z",
  "completed": ["ach-001"]
}
```

This version starts a fresh journal for the server wipe. Version 1 browser saves are not loaded, and version 1 backups cannot be imported; no migration is provided. JSON remains the backup format; permanent IDs make renaming safe.

Multiple tabs on the same origin update each other when storage changes. If two tabs change progress simultaneously, the last save wins.
