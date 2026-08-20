# My Bar

My Bar is a home bar management and ordering system for a personal home bar, used by the owner and their friends/family (not paying customers). It has three linked interfaces — a **Patron** screen for browsing/ordering drinks, a **Bartender** screen for recipe lookup, and a **Barback** screen for inventory tracking — all sharing one live view of what's actually in stock, so every screen agrees on what can and can't currently be made.

## Quickstart

1. Clone the repository:
   ```bash
   git clone https://github.com/icariumtech/my-bar.git
   cd my-bar
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and fill in `ANTHROPIC_API_KEY` (get one from [console.anthropic.com](https://console.anthropic.com/)).
4. Pull and start the container:
   ```bash
   docker compose pull && docker compose up -d
   ```

That's it — the image is public on GHCR, so no `docker login` is needed for a first-time pull.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server listen port — must match `compose.yml`'s `3000:3000` port mapping |
| `DB_PATH` | No | `./data/my-bar.db` | SQLite database file path, persisted via the `./data` bind mount |
| `NODE_ENV` | No | `production` | Disables dev-only CORS when set to `production` |
| `ANTHROPIC_API_KEY` | Yes | none | Server-side Claude API key used for AI features — never sent to the browser |

## Accessing the App

Once the container is running, each screen is available at:

- Patron: `http://<pi-ip>:3000/patron/`
- Bartender: `http://<pi-ip>:3000/bartender/`
- Barback: `http://<pi-ip>:3000/barback/`

Kiosk devices (iPads, phones) must use the LAN IP printed by `hostname -I` on the host machine, not `localhost` — `localhost` only resolves on the machine running the container itself.

## Updating

To update to the latest published image:

```bash
docker compose pull && docker compose up -d
```

`./data` (the SQLite database and its WAL files) persists untouched across the update — this command only swaps the container image, it never touches the bind-mounted data directory.

## Troubleshooting

View live logs:

```bash
docker compose logs -f
```

Common issues:

- **better-sqlite3 fails to load / "Cannot find module '.../better_sqlite3.node'"** — the platform lacks a prebuilt native binding for this image. Rebuild the image locally (`docker compose build`); the build stage's `python3`/`build-essential` toolchain will compile the binding from source for your platform.
- **Database appears corrupted or "database is locked" errors** — confirm `compose.yml` mounts the whole `./data` directory (`./data:/app/data`), not a single `.db` file. SQLite's WAL mode needs the `.db`, `.db-wal`, and `.db-shm` files to persist together on the same mount; mounting only the `.db` file breaks WAL coordination and can corrupt the database.

## Local Development (without Docker)

For contributors who want to run the app directly (without Docker), see `./setup.sh` (one-time install/build/schema setup) and `./start_server.sh` (start the dev server with LAN-accessible URLs printed).
