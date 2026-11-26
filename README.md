# TMPD achievement journal

A standalone, responsive checklist for all 139 supplied DayZ achievements in eight categories. “Eat it all” contains five subcategories. Uses the supplied artwork, plain HTML/CSS/JavaScript, and browser `localStorage`. There are no dependencies, external requests, accounts, or build steps.

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

Update `achievements.js`. Item IDs are derived from category ID, group ID, and normalized item name, so reordering lists preserves progress. Keep those identifiers and existing item names stable, or migrate stored/exported IDs when renaming them. The supplied names and spellings are preserved. Counts are calculated from the data.

`localStorage` key: `tmpd.achievements.v1`. Saved data and backup JSON share the format:

```json
{
  "app": "tmpd-achievements",
  "version": 1,
  "updatedAt": "2026-11-23T12:00:00.000Z",
  "completed": ["admin-bears/items/albright"]
}
```

Multiple tabs on the same origin update each other when storage changes. If two tabs change progress simultaneously, the last save wins.
