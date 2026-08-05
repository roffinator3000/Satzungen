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

// Kompakte Event-Listener für die Sidebar
document.getElementById('close-sidebar').addEventListener('click', () => appContainer.classList.   add('sidebar-closed'));
document.getElementById('open-sidebar') .addEventListener('click', () => appContainer.classList.remove('sidebar-closed'));

const closeMobileSidebar = () => { if (window.innerWidth <= 920) appContainer.classList.add('sidebar-closed'); };

// Event-Listener für die Reload-Buttons
document.getElementById('reload-sidebar').addEventListener('click', fetchFileList);
document.getElementById('reload-main').   addEventListener('click', fetchFileList);

// Laden der Dateiliste und -inhalte über die GitHub API (gezielt vom master-Branch)
async function fetchFileList() {
    statusEl.textContent = "Lade alle Dateien...";
    
    try {
        // 1. Liste holen
        // ?ref=master stellt sicher, dass wir auf dem richtigen Branch suchen
        // { cache: 'no-cache' } zwingt den Browser, bei jedem Aufruf dieser Funktion wirklich Github zu fragen
        const response = await fetch(
            `https://api.github.com/repos/roffinator3000/Satzungen/contents/pages?ref=master`, 
            { cache: 'no-cache' }
        );
        if (!response.ok) throw new Error("API-Limit erreicht oder Repo/Ordner nicht gefunden.");
        
        const data = await response.json();
        
        // 2. .md Dateien herausfiltern, als Objekte speichern und alphabetisch sortieren
        const mdFiles = data
            .filter(file => file.name.endsWith('.md'))
            .map(file => ({
                name: file.name,
                url: file.download_url,
                content: "" // Hier speichern wir gleich den Text
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (mdFiles.length === 0) throw new Error("Keine Markdown-Dateien im Ordner gefunden");

        // 3. Inhalte für alle Dateien parallel laden und im Objekt speichern
        statusEl.textContent = "Lade Dokumenttexte...";
        const fetchPromises = mdFiles.map(async (fileObj) => {
            const res = await fetch(fileObj.url);
            if (!res.ok) throw new Error(`Datei ${fileObj.name} konnte nicht heruntergeladen werden.`);
            
            // Speichert den Text direkt im Objekt (unser "Cache")
            fileObj.content = await res.text();
        });

        // Warten, bis alle Texte geladen sind
        await Promise.all(fetchPromises);

        // 4. Wenn wir hier ankommen, gab es keine Fehler und alles ist im RAM. Menü bauen!
        statusEl.textContent = "Alle Daten aktuell";
        buildMenu(mdFiles);

    } catch (error) {
        // Zentrales Error-Handling für Liste und Datei-Inhalte
        contentEl.innerHTML = `<h2 style="color: #ff7a7a;">Fehler beim Laden</h2>
                               <p class="muted">${error.message}</p>
                               <p>Stelle sicher, dass eine Verbindung besteht oder versuche es später nochmal.</p>
                               <p>Stelle auch sicher, dass Repository-Name und Benutzername im Skript korrekt sind.</p>`;
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
        });

        fileListEl.appendChild(a);
    });

    // Beim Starten direkt Gesamtdarstellung aller Dokumente laden
    loadAllMarkdownFiles(files, allBtn);
}

// Funktion zum Rendern einer EINZELNEN Datei
function loadMarkdownFile(fileObj, linkElement) {
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
    if(linkElement) linkElement.classList.add('active');

    statusEl.textContent = "Lade Inhalt...";
    if (badgeEl) badgeEl.textContent = `${fileObj.name}`;

    // Bedient sich einfach am vorgeladenen content
    contentEl.innerHTML = marked.parse(fileObj.content);
    closeMobileSidebar();
}

// Funktion zum Rendern ALLER Dateien inkl. dynamischem Inhaltsverzeichnis
function loadAllMarkdownFiles(files, linkElement) {
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
    if(linkElement) linkElement.classList.add('active');

    if(badgeEl) badgeEl.textContent = "Gesamtes Dokument";

    let combinedHtml = "";

    // Baut das HTML aus dem Cache zusammen
    files.forEach(fileObj => {
        if (fileObj.name.toLowerCase().includes("01-inhalt"))
            // Platzhalter für das dynamische Inhaltsverzeichnis einfügen
            combinedHtml += `<div id="dynamic-toc"></div>`;
        else
            combinedHtml += marked.parse(fileObj.content);
    });

    contentEl.innerHTML = combinedHtml;

    // Inhaltsverzeichnis (ToC) generieren
    const tocContainer = document.getElementById('dynamic-toc');
    if (tocContainer) {
        statusEl.textContent = "Erstelle Inhaltsverzeichnis";
        let tocHTML = "<h1>Satzung der Fachschaft Informatik</h1><br><h2>Inhalt</h2><ul style='padding-left: 0;'>";
        
        // Alle Überschriften im gerenderten Text suchen
        const headings = contentEl.querySelectorAll('h2, h3, h4');
        
        headings.forEach((heading) => {
            if (heading.textContent === "Inhalt"
             || heading.textContent === "Fachschaftsrat Informatik der Hochschule Bonn-Rhein-Sieg")
            return;

            if (!heading.id) heading.id = heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
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
    closeMobileSidebar();
}

fetchFileList();