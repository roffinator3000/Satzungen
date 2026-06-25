/*
 * WARNING
 * This file is more or less VIBE-CODED
 * I try to mend any slop Gemini 3.1 PRO spits out but idk about JS or WebDev
*/

const fileListEl   = document.getElementById('file-list');
const contentEl    = document.getElementById('markdown-content');
const badgeEl      = document.getElementById('current-file-badge');
const statusEl     = document.getElementById('viewer-status');
const appContainer = document.getElementById('app-container');
const closeBtn = document.getElementById('close-sidebar');
const openBtn = document.getElementById('open-sidebar');

closeBtn.addEventListener('click', () => {
    appContainer.classList.add('sidebar-closed');
});

openBtn.addEventListener('click', () => {
    appContainer.classList.remove('sidebar-closed');
});

// Laden der Dateiliste über die GitHub API (gezielt vom master-Branch)
async function fetchFileList() {
    statusEl.textContent = "Lade Dateiliste...";
    try {
        // ?ref=master stellt sicher, dass wir auf dem richtigen Branch suchen
        const response = await fetch(`https://api.github.com/repos/roffinator3000/Satzungen/contents/pages?ref=master`);
        if (!response.ok) throw new Error("API-Limit erreicht oder Repo/Ordner nicht gefunden.");
        
        const data = await response.json();
        
        // .md Dateien herausfiltern, als Objekte (mit Name UND Download-URL) speichern und alphabetisch sortieren
        const mdFiles = data
            .filter(file => file.name.endsWith('.md'))
            .map(file => ({
                name: file.name,
                url: file.download_url
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (mdFiles.length === 0) throw new Error("Keine Markdown-Dateien im Ordner gefunden");

        buildMenu(mdFiles);
    } catch (error) {
        contentEl.innerHTML = `<h2 style="color: #ff7a7a;">Fehler beim Laden der Dateiliste</h2>
                               <p class="muted">${error.message}</p>
                               <p>Stelle sicher, dass Repository-Name und Benutzername im Skript korrekt sind.</p>`;
        statusEl.textContent = "Fehler";
    }
}

function buildMenu(files) {
    fileListEl.innerHTML = ""; // Vorheriges leeren
    
    // "Alle anzeigen" Button
    const allBtn = document.createElement('a');
    allBtn.href = "#";
    allBtn.className = "file-item";
    allBtn.innerHTML = `
    <span class="file-title" style="color: var(--accent-2);">SATZUNG</span>
    <span class="file-path">Gesamtes Dokument</span>
    `;
    allBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loadAllMarkdownFiles(files, allBtn);
        if (window.innerWidth <= 920) {
            appContainer.classList.add('sidebar-closed');
        }
    });
    fileListEl.appendChild(allBtn);

    files.forEach((fileObj) => {
        const a = document.createElement('a');
        a.href = "#";
        a.className = "file-item";
        
        const title = fileObj.name.replace('.md', '').replace(/-/g, ' ');

        a.innerHTML = `
            <span class="file-title">${title.toUpperCase()}</span>
            <span class="file-path">pages/${fileObj.name}</span>
        `;

        a.addEventListener('click', (e) => {
            e.preventDefault();
            loadMarkdownFile(fileObj, a);
            if (window.innerWidth <= 920) appContainer.classList.add('sidebar-closed');
        });

        fileListEl.appendChild(a);
    });

    // Beim Starten direkt alle Dokumente laden
    loadAllMarkdownFiles(files, allBtn);
}

// Funktion zum Laden und Rendern einer EINZELNEN Datei
async function loadMarkdownFile(fileObj, linkElement) {
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
    if(linkElement) linkElement.classList.add('active');

    statusEl.textContent = "Lade Inhalt...";
    if (badgeEl) badgeEl.textContent = `${fileObj.name}`;

    try {
        // Direkter Fetch über die raw download_url von GitHub
        const response = await fetch(fileObj.url);
        if (!response.ok) throw new Error(`HTTP Fehler ${response.status}`);
        
        const markdownText = await response.text();
        contentEl.innerHTML = marked.parse(markdownText);
        statusEl.textContent = "Erfolgreich geladen";
    } catch (error) {
        contentEl.innerHTML = `<h2 style="color: #ff7a7a;">Fehler beim Laden</h2>
                               <p>Die Datei <code>pages/${fileObj.name}</code> konnte nicht geladen werden.</p>`;
        statusEl.textContent = "Fehler";
    }
}

// Funktion zum Laden ALLER Dateien inkl. dynamischem Inhaltsverzeichnis
async function loadAllMarkdownFiles(files, linkElement) {
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
    if(linkElement) linkElement.classList.add('active');

    statusEl.textContent = "Lade alle Inhalte...";
    if(badgeEl) badgeEl.textContent = "Gesamtes Dokument";

    try {
        // Lädt alle Dateien parallel über ihre raw download_urls herunter, behält den Dateinamen bei
        const fetchPromises = files.map(fileObj => 
            fetch(fileObj.url).then(res => {
                if (!res.ok) throw new Error(`HTTP Fehler bei ${fileObj.name}`);
                return res.text().then(text => ({ filename: fileObj.name, text }));
            })
        );

        const results = await Promise.all(fetchPromises);
        let combinedHtml = "";

        // Baut das HTML zusammen
        results.forEach(({ filename, text }) => {
            if (filename.toLowerCase().includes("01-inhalt")) {
                // Prüfen, ob das die Inhalts-Datei ist und Platzhalter für das dynamische Inhaltsverzeichnis einfügen
                combinedHtml += `<div id="dynamic-toc"></div>`;
            } else {
                combinedHtml += marked.parse(text);
            }
        });

        contentEl.innerHTML = combinedHtml;

        // Inhaltsverzeichnis (ToC) generieren
        const tocContainer = document.getElementById('dynamic-toc');
        if (tocContainer) {
            statusEl.textContent = "Erstelle Inhaltsverzeichnis";
            let tocHTML = "<h1>Satzung der Fachschaft Informatik</h1><br><h2>Inhalt</h2><ul style='padding-left: 0;'>";
        
            // Alle Überschriften im gerenderten Text suchen (h2 und h3 sind meist relevant)
            const headings = contentEl.querySelectorAll('h2, h3, h4');
        
            headings.forEach((heading) => {
                // Die Überschrift des Inhaltsverzeichnisses selbst überspringen
                if (heading.textContent === "Inhalt"
                 || heading.textContent === "Fachschaftsrat Informatik der Hochschule Bonn-Rhein-Sieg")
                return;

                // Falls marked.js keine ID vergeben hat, generieren wir eine
                if (!heading.id) heading.id = heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                // Einrückung basierend auf der Überschriften-Ebene (h2 = 0px, h3 = 20px, etc.)
                const level = parseInt(heading.tagName.substring(1));
                const indent = (level - 2) * 20;

                tocHTML += `<li style="margin-left: ${indent}px; list-style-type: none; margin-bottom: 8px;">
                            <a href="#${heading.id}" style="color: var(--accent); text-decoration: none;">
                                ${heading.textContent}
                            </a>
                            </li>`;
            });
            tocHTML += "</ul><hr style='border: 0; border-bottom: 1px solid var(--border); margin: 2em 0;'>";
            tocContainer.innerHTML = tocHTML;
        }

        statusEl.textContent = "Alle geladen";
    } catch (error) {
        contentEl.innerHTML = `<h2 style="color: #ff7a7a;">Fehler beim Laden</h2>
                               <p>Eine oder mehrere Dateien konnten nicht geladen werden.</p>
                               <p class="muted">${error.message}</p>`;
        statusEl.textContent = "Fehler";
    }
}

fetchFileList();