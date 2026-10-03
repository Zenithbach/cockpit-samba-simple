# cockpit-samba-simple — Makefile
# Install/uninstall targets for the Cockpit plugin.

DESTDIR  ?=
PLUGIN_DIR ?= $(DESTDIR)/usr/share/cockpit/samba-simple

FILES = manifest.json index.html samba.js samba.py

.PHONY: all install uninstall check dist clean

all: check

# Sanity-check the files before installing
check:
	@for f in $(FILES); do \
		test -f $$f || { echo "missing file: $$f" >&2; exit 1; }; \
	done
	@python3 -m py_compile samba.py && echo "samba.py: syntax OK"
	@command -v testparm >/dev/null || \
		echo "warning: testparm not found (install samba-common for full functionality)"

# Install the plugin
install: check
	install -d $(PLUGIN_DIR)
	install -m 0644 manifest.json index.html samba.js $(PLUGIN_DIR)/
	install -m 0755 samba.py $(PLUGIN_DIR)/
	@echo "Installed to $(PLUGIN_DIR) — reload Cockpit in your browser."

# Remove the plugin
uninstall:
	rm -rf $(PLUGIN_DIR)
	@echo "Removed $(PLUGIN_DIR)"

# Source tarball for releases
VERSION ?= 1.0.0
dist:
	git archive --format=tar.gz --prefix=cockpit-samba-simple-$(VERSION)/ \
		-o cockpit-samba-simple-$(VERSION).tar.gz HEAD
	@echo "Wrote cockpit-samba-simple-$(VERSION).tar.gz"

clean:
	rm -f cockpit-samba-simple-*.tar.gz
	rm -rf __pycache__
