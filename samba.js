/* cockpit-samba-simple: list, add, edit and delete Samba shares.
 * Designed and created by Mistral AI for Geoff Love.
 */
const cockpit = require("cockpit");

const PLUGIN_SCRIPT = "/usr/share/cockpit/samba-simple/samba.py";

const sharesBody = document.getElementById("shares-body");
const statusEl = document.getElementById("status");
let dialogOriginal = null; // share name being edited, or null when adding

function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#c9190b" : "";
}

/* ---- bridge helpers ---- */

function runBridge(args) {
    return cockpit.spawn(["python3", PLUGIN_SCRIPT].concat(args),
                         { superuser: true, err: "message" });
}

function listShares() {
    return runBridge(["list"])
            .then(output => JSON.parse(output));
}

function saveShare(options) {
    return runBridge(["save", JSON.stringify(options)]);
}

function deleteShare(name) {
    return runBridge(["delete", name]);
}

function restartSamba() {
    // Debian names the service smbd, RHEL/Fedora name it smb
    return cockpit.spawn(["systemctl", "restart", "smbd"], { superuser: true, err: "message" })
            .catch(() => cockpit.spawn(["systemctl", "restart", "smb"], { superuser: true, err: "message" }));
}

/* ---- rendering ---- */

function renderShares(shares) {
    sharesBody.innerHTML = "";
    if (!shares.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = '<td colspan="6">No shares configured yet.</td>';
        sharesBody.appendChild(tr);
        return;
    }
    for (const s of shares) {
        const tr = document.createElement("tr");

        const cells = [
            s.name,
            s.path,
            s.users || "everyone",
            s.readonly ? "yes" : "no",
            s.browseable ? "yes" : "no"
        ];
        cells.forEach(v => {
            const td = document.createElement("td");
            td.textContent = v;
            tr.appendChild(td);
        });

        const tdBtn = document.createElement("td");
        tdBtn.style.textAlign = "right";

        const btnEdit = document.createElement("button");
        btnEdit.className = "pf-c-button pf-m-secondary";
        btnEdit.textContent = "Edit";
        btnEdit.onclick = () => openDialog(s);

        const btnDel = document.createElement("button");
        btnDel.className = "pf-c-button pf-m-danger";
        btnDel.textContent = "Delete";
        btnDel.style.marginLeft = "0.5em";
        btnDel.onclick = () => {
            if (confirm('Delete share "' + s.name + '"?')) {
                deleteShare(s.name)
                        .then(restartSamba)
                        .then(refresh)
                        .catch(e => setStatus(e.message || String(e), true));
            }
        };

        tdBtn.append(btnEdit, btnDel);
        tr.appendChild(tdBtn);
        sharesBody.appendChild(tr);
    }
}

function refresh() {
    return listShares()
            .then(renderShares)
            .catch(e => {
                sharesBody.innerHTML = "";
                setStatus("Could not read shares: " + (e.message || e), true);
            });
}

/* ---- dialog ---- */

const dialog = document.getElementById("share-dialog");
const form = document.getElementById("share-form");

function openDialog(share) {
    dialogOriginal = share ? share.name : null;
    document.getElementById("dialog-title").textContent =
        share ? ('Edit share "' + share.name + '"') : "Add share";
    document.getElementById("f-name").value = share ? share.name : "";
    document.getElementById("f-path").value = share ? share.path : "/srv/";
    document.getElementById("f-comment").value = share ? (share.comment || "") : "";
    document.getElementById("f-users").value = share ? (share.users || "") : "";
    document.getElementById("f-readonly").checked = share ? share.readonly : false;
    document.getElementById("f-browseable").checked = share ? share.browseable : true;
    dialog.showModal();
}

document.getElementById("btn-add").addEventListener("click", () => openDialog(null));

form.addEventListener("submit", ev => {
    ev.preventDefault();
    const options = {
        original: dialogOriginal,
        name: document.getElementById("f-name").value.trim(),
        path: document.getElementById("f-path").value.trim(),
        comment: document.getElementById("f-comment").value.trim(),
        users: document.getElementById("f-users").value.trim(),
        readonly: document.getElementById("f-readonly").checked,
        browseable: document.getElementById("f-browseable").checked
    };
    setStatus("Saving...");
    saveShare(options)
            .then(restartSamba)
            .then(() => { dialog.close(); setStatus("Saved and Samba restarted."); return refresh(); })
            .catch(e => setStatus(e.message || String(e), true));
});

refresh();
