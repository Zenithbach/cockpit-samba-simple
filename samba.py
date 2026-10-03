#!/usr/bin/python3
"""cockpit-samba-simple bridge.

Edits /etc/samba/smb.conf safely: backs up first, writes atomically, and
validates with testparm before the change goes live.

Designed and created by Mistral AI for Geoff Love.
"""
import configparser
import json
import os
import shutil
import subprocess
import sys
import tempfile

SMB_CONF = "/etc/samba/smb.conf"
BACKUP_DIR = "/var/backups/cockpit-samba"
KEEP_BACKUPS = 10


def read_config():
    parser = configparser.ConfigParser(strict=False)
    parser.read(SMB_CONF)
    return parser


def write_config(parser):
    # 1. backup
    os.makedirs(BACKUP_DIR, exist_ok=True)
    existing = sorted(os.listdir(BACKUP_DIR))
    if len(existing) >= KEEP_BACKUPS:
        os.remove(os.path.join(BACKUP_DIR, existing[0]))
    shutil.copy2(SMB_CONF, os.path.join(
        BACKUP_DIR, "smb.conf." + str(len(existing) + 1)))

    # 2. write atomically, validate BEFORE replacing the live config
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(SMB_CONF))
    try:
        with os.fdopen(fd, "w") as f:
            parser.write(f)
        check = subprocess.run(["testparm", "-s", tmp],
                               capture_output=True, text=True)
        if check.returncode != 0:
            raise RuntimeError("testparm rejected the config: "
                              + check.stderr.strip())
        os.replace(tmp, SMB_CONF)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


def list_shares():
    parser = read_config()
    shares = []
    for section in parser.sections():
        if section == "global" or not parser.has_option(section, "path"):
            continue
        shares.append({
            "name": section,
            "path": parser.get(section, "path", fallback=""),
            "comment": parser.get(section, "comment", fallback=""),
            "users": parser.get(section, "valid users", fallback=""),
            "readonly": parser.getboolean(section, "read only", fallback=False),
            "browseable": parser.getboolean(section, "browseable", fallback=True),
        })
    return shares


def save_share(opts):
    name = opts["name"]
    original = opts.get("original") or ""
    parser = read_config()
    if original and original != name:
        if not parser.has_section(original):
            raise RuntimeError("No share named '" + original + "'")
        parser.remove_section(original)
    if not parser.has_section(name):
        parser.add_section(name)
    parser.set(name, "path", opts["path"])
    if opts.get("comment"):
        parser.set(name, "comment", opts["comment"])
    if opts.get("users"):
        parser.set(name, "valid users", opts["users"])
    parser.set(name, "read only", "yes" if opts.get("readonly") else "no")
    parser.set(name, "browseable", "yes" if opts.get("browseable") else "no")
    write_config(parser)


def delete_share(name):
    parser = read_config()
    if not parser.has_section(name):
        raise RuntimeError("No share named '" + name + "'")
    parser.remove_section(name)
    write_config(parser)


def main():
    if len(sys.argv) < 2:
        print("usage: samba.py list|save|delete [...]", file=sys.stderr)
        sys.exit(2)
    cmd = sys.argv[1]
    if cmd == "list":
        print(json.dumps(list_shares()))
    elif cmd == "save":
        save_share(json.loads(sys.argv[2]))
    elif cmd == "delete":
        delete_share(sys.argv[2])
    else:
        print("unknown command: " + cmd, file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
