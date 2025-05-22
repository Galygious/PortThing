// PortThing – script.js

const escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
};
function escapeHtml(str = "") {
    return str.replace(/[&<>"']/g, m => escapeMap[m]);
}

(async function () {
    const searchInput = document.getElementById("searchInput");
    const protocolSelect = document.getElementById("protocolSelect");
    const resultsCount = document.getElementById("resultsCount");
    const tbody = document.querySelector("#resultsTable tbody");

    let allData = [];

    // Fetch and parse nmap-services
    try {
        const text = await fetch("./nmap-services").then(r => {
            if (!r.ok) throw new Error("Failed to load nmap-services file");
            return r.text();
        });
        allData = parseServices(text);
        update();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4" style="color:#ff6b6b; text-align:center">Unable to load nmap-services file.</td></tr>`;
    }

    // Event listeners
    searchInput.addEventListener("input", debounce(update, 150));
    protocolSelect.addEventListener("change", update);

    function parseServices(text) {
        const lines = text.split(/\r?\n/);
        const data = [];
        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith("#")) continue;
            const parts = line.split(/\s+/);
            if (parts.length < 3) continue;
            const service = parts[0];
            const [portStr, protocol] = parts[1].split("/");
            const port = parseInt(portStr, 10);
            const frequency = parseFloat(parts[2]);
            const description = parts.slice(3).join(" ").replace(/^#\s?/, "");
            data.push({ service, port, protocol, frequency, description });
        }
        return data;
    }

    function update() {
        const query = searchInput.value.trim().toLowerCase();
        const protoFilter = protocolSelect.value;

        let filtered = allData;
        if (protoFilter !== "any") {
            filtered = filtered.filter(d => d.protocol === protoFilter);
        }
        if (query) {
            filtered = filtered.filter(d => {
                return (
                    d.service.toLowerCase().includes(query) ||
                    d.description.toLowerCase().includes(query) ||
                    String(d.port).includes(query)
                );
            });
        }

        resultsCount.textContent = `${filtered.length.toLocaleString()} result${filtered.length !== 1 ? "s" : ""}`;
        renderTable(filtered.slice(0, 2000)); // safety cap to 2000 rows
    }

    function renderTable(rows) {
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--muted)">No matches found.</td></tr>`;
            return;
        }
        const html = rows
            .map(
                r => `<tr><td>${r.port}</td><td>${r.protocol}</td><td>${escapeHtml(
                    r.service
                )}</td><td>${escapeHtml(r.description)}</td></tr>`
            )
            .join("");
        tbody.innerHTML = html;
    }

    function debounce(fn, ms = 0) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }
})(); 