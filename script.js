// PortThing – script.js

(async function () {
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

    const searchInput = document.getElementById("searchInput");
    const protocolSelect = document.getElementById("protocolSelect");
    const resultsCount = document.getElementById("resultsCount");
    const tbody = document.querySelector("#resultsTable tbody");
    const unknownOnlyChk = document.getElementById("unknownOnly");
    const rareOnlyChk = document.getElementById("rareOnly");
    let sentinel = document.getElementById("sentinel");
    if (!sentinel) {
        sentinel = document.createElement("div");
        sentinel.id = "sentinel";
        sentinel.style.height = "1px";
        document.body.appendChild(sentinel);
    }

    let allData = [];
    let currentRows = [];
    let rendered = 0;
    const CHUNK = 400;
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            addChunk();
        }
    });

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
    rareOnlyChk.addEventListener("change", update);
    unknownOnlyChk.addEventListener("change", update);

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
        if (unknownOnlyChk.checked) {
            filtered = filtered.filter(d => d.service === "unknown");
        }
        if (rareOnlyChk.checked) {
            filtered = filtered.filter(d => d.frequency < 0.001);
        }

        currentRows = filtered;
        rendered = 0;
        tbody.innerHTML = "";
        addChunk();
        observer.disconnect();
        if (currentRows.length > rendered && sentinel) {
            observer.observe(sentinel);
        }

        resultsCount.textContent = `${currentRows.length.toLocaleString()} result${currentRows.length !== 1 ? "s" : ""}`;
    }

    function addChunk() {
        if (rendered >= currentRows.length) {
            observer.disconnect();
            return;
        }
        const frag = document.createDocumentFragment();
        const end = Math.min(rendered + CHUNK, currentRows.length);
        for (let i = rendered; i < end; i++) {
            const r = currentRows[i];
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${r.port}</td><td>${r.protocol}</td><td>${escapeHtml(r.service)}</td><td>${escapeHtml(r.description)}</td>`;
            frag.appendChild(tr);
        }
        rendered = end;
        tbody.appendChild(frag);
        if (rendered >= currentRows.length) {
            observer.disconnect();
        }
    }

    function debounce(fn, ms = 0) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }
})(); 