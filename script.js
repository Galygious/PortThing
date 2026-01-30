// PortThing – script.js

(async function () {
    const searchInput = document.getElementById("searchInput");
    const protocolSelect = document.getElementById("protocolSelect");
    const resultsCount = document.getElementById("resultsCount");
    const tbody = document.querySelector("#resultsTable tbody");
    const unusedMinLength = document.getElementById("unusedMinLength");
    const unusedMaxRanges = document.getElementById("unusedMaxRanges");
    const unusedSummary = document.getElementById("unusedSummary");
    const unusedRanges = document.getElementById("unusedRanges");

    let allData = [];
    let usedPortsByProtocol = new Map();

    // Fetch and parse nmap-services
    try {
        const text = await fetch("./nmap-services").then(r => {
            if (!r.ok) throw new Error("Failed to load nmap-services file");
            return r.text();
        });
        allData = parseServices(text);
        usedPortsByProtocol = buildUsedPortsMap(allData);
        update();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4" style="color:#ff6b6b; text-align:center">Unable to load nmap-services file.</td></tr>`;
    }

    // Event listeners
    searchInput.addEventListener("input", debounce(update, 150));
    protocolSelect.addEventListener("change", update);
    unusedMinLength.addEventListener("input", debounce(updateUnusedRanges, 150));
    unusedMaxRanges.addEventListener("input", debounce(updateUnusedRanges, 150));

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
        updateUnusedRanges();
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

    function buildUsedPortsMap(data) {
        const map = new Map([
            ["tcp", new Set()],
            ["udp", new Set()],
            ["sctp", new Set()]
        ]);
        for (const entry of data) {
            if (!map.has(entry.protocol)) continue;
            if (Number.isInteger(entry.port) && entry.port >= 1 && entry.port <= 65535) {
                map.get(entry.protocol).add(entry.port);
            }
        }
        return map;
    }

    function updateUnusedRanges() {
        if (!usedPortsByProtocol.size) return;
        const protoFilter = protocolSelect.value;
        const minLength = Math.max(1, Number.parseInt(unusedMinLength.value, 10) || 1);
        const maxRanges = Math.max(1, Number.parseInt(unusedMaxRanges.value, 10) || 1);

        const usedPorts = protoFilter === "any" ? mergeUsedPorts() : usedPortsByProtocol.get(protoFilter);
        const ranges = calculateUnusedRanges(usedPorts, minLength);
        const limitedRanges = ranges.slice(0, maxRanges);

        unusedSummary.textContent = `Found ${ranges.length.toLocaleString()} ranges (min ${minLength} ports). Showing ${limitedRanges.length.toLocaleString()}.`;

        if (!limitedRanges.length) {
            unusedRanges.innerHTML = `<li>No unused ranges match the current filters.</li>`;
            return;
        }

        unusedRanges.innerHTML = limitedRanges
            .map(range => {
                const label = `${range.start.toLocaleString()}–${range.end.toLocaleString()}`;
                return `<li><strong>${label}</strong> · ${range.length.toLocaleString()} ports</li>`;
            })
            .join("");
    }

    function mergeUsedPorts() {
        const merged = new Set();
        for (const ports of usedPortsByProtocol.values()) {
            for (const port of ports) {
                merged.add(port);
            }
        }
        return merged;
    }

    function calculateUnusedRanges(usedPorts, minLength) {
        const ranges = [];
        let start = null;
        for (let port = 1; port <= 65535; port += 1) {
            if (usedPorts && usedPorts.has(port)) {
                if (start !== null) {
                    ranges.push({ start, end: port - 1, length: port - start });
                    start = null;
                }
            } else if (start === null) {
                start = port;
            }
        }
        if (start !== null) {
            ranges.push({ start, end: 65535, length: 65536 - start });
        }

        return ranges
            .filter(range => range.length >= minLength)
            .sort((a, b) => b.length - a.length || b.start - a.start);
    }

    function debounce(fn, ms = 0) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

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
})(); 
