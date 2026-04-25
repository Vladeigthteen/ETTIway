/**
 * graph-editor.js - Graph Editor for Navigation
 */

// 1. CONSTANTELE API (La început)
const API_SAVE_ENDPOINT = '/api/graph/save';
const API_LOAD_ENDPOINT = '/api/graph/load';

/**
 * Initialize the Graph Editor
 */
function initGraphEditor(map, drawnItems) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') !== '1') {
        console.log("Graph Editor disabled (edit mode off)");
        return;
    }

    // Configurare Geoman
    map.pm.setGlobalOptions({
        layerGroup: drawnItems,
        snappable: true,
        snapDistance: 20,
        snapMiddle: false,
        allowSelfIntersection: true,
        editable: true
    });

    // Adăugare Controlere Geoman (butoanele de sus-stânga)
    map.pm.addControls({
        position: 'topleft',
        drawMarker: true,
        drawPolyline: true,
        editMode: true,
        dragMode: true,
        removalMode: true
    });

    // Adăugare butoanele noastre personalizate (Save/Load)
    addCustomControls(map, drawnItems);

    console.log("Graph Editor Initialized");
}

/**
 * Crearea butoanelor de Save Graph și Load Graph în interfață
 */
function addCustomControls(map, drawnItems) {
    const Control = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.backgroundColor = 'white';
            container.style.padding = '5px';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '5px';

            // Buton ERASE
            const eraseBtn = document.createElement('button');
            eraseBtn.innerHTML = '🗑️ Erase Graph';
            eraseBtn.style.color = 'red';
            eraseBtn.onclick = () => eraseGraph(drawnItems);

            // Buton SAVE
            const saveBtn = document.createElement('button');
            saveBtn.innerText = '💾 Save Graph';
            saveBtn.onclick = () => saveGraph(drawnItems);

            // Buton LOAD
            const loadBtn = document.createElement('button');
            loadBtn.innerText = '📂 Load Graph';
            loadBtn.onclick = () => loadGraph(drawnItems);

            container.appendChild(eraseBtn);
            container.appendChild(saveBtn);
            container.appendChild(loadBtn);
            return container;
        }
    });
    map.addControl(new Control());
}

/**
 * FUNCȚIA DE ȘTERGERE COMPLETĂ A GRAFULUI
 */
async function eraseGraph(drawnItems) {
    if (!confirm('Ești sigur că vrei să ștergi permanent întregul graf din baza de date? Această acțiune este ireversibilă!')) {
        return;
    }

    // 1. Curăță harta (șterge elementele locale)
    drawnItems.clearLayers();

    // 2. Șterge din baza de date folosind apelul de DELETE
    try {
        const response = await fetch('/api/graph/erase', { method: 'DELETE' });
        if (response.ok) {
            alert('Graful a fost șters complet cu succes!');
        } else {
            alert('Graful a fost șters cu succes, dar am primit un avertisment (' + response.status + ') de la server.');
        }
    } catch (e) {
        alert('Eroare de rețea. Am șters elementele de pe hartă doar vizual.');
    }
}

/**
 * FUNCȚIA DE SALVARE
 */
async function saveGraph(drawnItems) {
    let geoJSON = drawnItems.toGeoJSON();

    // Filtrăm DOAR nodurile (Puncte) și rutele de navigare (Linestrings), ignorând Poligoanele (clădirile - dacă din greșeală apar)
    if (geoJSON && geoJSON.features) {
        geoJSON.features = geoJSON.features.filter(f => 
            f.geometry.type === 'Point' || f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
        );
    }

    // Dacă utilizatorul apasă Save Graph după ce a șters manual totul layer cu layer, apelăm endpoint-ul specific de /erase.
    if (!geoJSON.features || geoJSON.features.length === 0) {
        if (confirm('Pe hartă nu mai există elemente desenate (rutări de navigare). Dorești să salvezi o formă goală (să resetezi graful efectiv)?')) {
            await eraseGraph(drawnItems);
            return;
        } else {
            return;
        }
    }

    try {
        const response = await fetch(API_SAVE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geoJSON)
        });

        if (response.ok) {
            alert('Succes! Graful a fost salvat în baza de date.');
        } else {
            alert('Eroare la server (' + response.status + ').');
            downloadJSON(geoJSON, 'graph_backup.json'); // Siguranță
        }
    } catch (error) {
        alert('Eroare de rețea. Am descărcat fișierul local.');
        downloadJSON(geoJSON, 'graph_backup.json');
    }
}

/**
 * FUNCȚIA DE ÎNCĂRCARE
 */
async function loadGraph(drawnItems) {
    try {
        const response = await fetch(API_LOAD_ENDPOINT);
        if (response.ok) {
            const textJSON = await response.text();
            
            // Asigură-te că loadGraph lasă harta curată dacă e goală DB
            drawnItems.clearLayers();
            if (!textJSON || textJSON.trim() === '{}' || textJSON.trim() === '') {
                alert('Nu există graf salvat (Harta este goală).');
                return;
            }
            
            const geoJSON = JSON.parse(textJSON);
            
            // Suplimentar: dacă backend-ul a reîntors un Features list gol "{"type": "FeatureCollection", "features": []}"
            if (!geoJSON || Object.keys(geoJSON).length === 0 || (geoJSON.features && geoJSON.features.length === 0)) {
                alert('Nu există elemente în graful salvat anterior.');
                return;
            }

            L.geoJSON(geoJSON, {
                onEachFeature: (feature, layer) => {
                    drawnItems.addLayer(layer);
                }
            });
            alert('Graful a fost încărcat din baza de date!');
        } else {
            alert('A survenit o problemă la interogarea grafului.');
        }
    } catch (error) {
        alert('Eroare la încărcare.');
    }
}

// Funcția de descărcare locală (doar pentru urgențe/erori)
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}