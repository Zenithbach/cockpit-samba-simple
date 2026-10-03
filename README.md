# cockpit-samba-simple

A simple [Cockpit](https://cockpit-project.org/) plugin to manage Samba shares from the browser — list, add, edit, and delete shares without touching `smb.conf` by hand.

Built to be lightweight: a handful of files, no build step required, no frameworks.

## Features

- 📋 List all configured Samba shares at a glance
- ➕ Add / edit / delete shares through a simple form
- 🛡️ **Safety first:** every change is backed up, written atomically, and validated with `testparm` *before* it goes live — a bad edit can never break your Samba
- 🔁 One-click Samba restart after changes (handles both `smbd` and `smb` service names)
- 🪶 Minimal footprint — 4 files, no node_modules

## Screenshots

*(coming soon)*

## Requirements

- Cockpit 186 or newer
- Samba (`testparm` comes with `samba-common`)
- Python 3
- A Linux distro with systemd (for the service restart)

## Install

```bash
git clone https://github.com/Zenithbach/cockpit-samba-simple.git
cd cockpit-samba-simple
sudo make install
```

Then reload Cockpit in your browser (Ctrl+Shift+R). **Samba Shares** appears in the sidebar.

Uninstall:

```bash
sudo make uninstall
```

### Manual install

If you prefer not to use make:

```bash
sudo mkdir -p /usr/share/cockpit/samba-simple
sudo cp manifest.json index.html samba.js samba.py /usr/share/cockpit/samba-simple/
```

## How it works

The plugin is a small Cockpit page (`index.html` + `samba.js`) that talks to a Python bridge (`samba.py`) via `cockpit.spawn`. The bridge is the only thing that touches `/etc/samba/smb.conf`:

1. Backs up the current config to `/var/backups/cockpit-samba` (keeps the last 10)
2. Writes the new config to a temp file
3. Validates it with `testparm`
4. Only then atomically replaces the live config (`os.replace`)

If `testparm` rejects the change, the live config is never touched.

## Alternatives

This plugin intentionally stays minimal. If you need more (NFS, iSCSI, S3, user management), look at:

- [45Drives/cockpit-file-sharing](https://github.com/45Drives/cockpit-file-sharing) — full-featured, built for 45Drives hardware

## Credits

**Designed and created by Mistral AI** — for Geoff Love, who just wanted to stop editing `smb.conf` by hand. 🦄

## License

[MIT](LICENSE)

---

*This project is not affiliated with the Cockpit Project. "Cockpit" is used only to describe compatibility.*
