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
    const isEditMode = params.get('edit') === '1';

    if (!isEditMode) {
        console.log("Graph Editor UI disabled (edit mode off). Pre-loading navigation graph in memory...");
        // Încărcăm graful în ascuns, doar pentru a alimenta `window.navigationData` și algoritmul de rutare
        loadGraph(drawnItems);
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
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control admin-graph-controls');

            // Buton ERASE
            const eraseBtn = document.createElement('button');
            eraseBtn.innerHTML = '🗑️ Erase Graph';
            eraseBtn.className = 'admin-btn erase-btn';
            eraseBtn.onclick = () => eraseGraph(drawnItems);

            // Buton SAVE
            const saveBtn = document.createElement('button');
            saveBtn.innerText = '💾 Save Graph';
            saveBtn.className = 'admin-btn';
            saveBtn.onclick = () => saveGraph(drawnItems);

            // Buton LOAD
            const loadBtn = document.createElement('button');
            loadBtn.innerText = '📂 Load Graph';
            loadBtn.className = 'admin-btn';
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
            showToast('Graful a fost șters complet cu succes!', 'success');
        } else {
            showToast('Graful a fost șters cu succes, dar am primit un avertisment (' + response.status + ') de la server.', 'warning');
        }
    } catch (e) {
        showToast('Eroare de rețea. Am șters elementele de pe hartă doar vizual.', 'error');
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
            showToast('Succes! Graful a fost salvat în baza de date.', 'success');
        } else {
            showToast('Eroare la server (' + response.status + '). Funcția fallback: descărcare locală.', 'error');
            downloadJSON(geoJSON, 'graph_backup.json'); // Siguranță
        }
    } catch (error) {
        showToast('Eroare de rețea. Am descărcat fișierul local.', 'error');
        downloadJSON(geoJSON, 'graph_backup.json');
    }
}

/**
 * FUNCȚIA DE ÎNCĂRCARE
 */
async function loadGraph(drawnItems) {
    const isEditMode = new URLSearchParams(window.location.search).get('edit') === '1';

    try {
        const response = await fetch(API_LOAD_ENDPOINT);
        if (response.ok) {
            const textJSON = await response.text();
            
            // Asigură-te că loadGraph lasă harta curată dacă e goală DB (doar în edit mode)
            if (isEditMode && drawnItems) {
                drawnItems.clearLayers();
            }

            if (!textJSON || textJSON.trim() === '{}' || textJSON.trim() === '') {
                window.navigationData = null;
                if (isEditMode) showToast('Nu există graf salvat (Harta este goală).', 'info');
                return;
            }
            
            const geoJSON = JSON.parse(textJSON);
            
            // Salvăm datele în variabila ascunsă globală (pentru rutare)
            window.navigationData = geoJSON;
            
            // Suplimentar: dacă backend-ul a reîntors un Features list gol "{"type": "FeatureCollection", "features": []}"
            if (!geoJSON || Object.keys(geoJSON).length === 0 || (geoJSON.features && geoJSON.features.length === 0)) {
                if (isEditMode) showToast('Nu există elemente în graful salvat anterior.', 'info');
                return;
            }

            // Dacă suntem în modul de editare, desenăm pe hartă
            if (isEditMode) {
                L.geoJSON(geoJSON, {
                    onEachFeature: (feature, layer) => {
                        if (drawnItems) drawnItems.addLayer(layer);
                    }
                });
                showToast('Graful a fost încărcat din baza de date!', 'success');
            } else {
                console.log('Graful a fost încărcat în memorie (navigationData), dar este ascuns pe hartă.');
            }
        } else {
            console.error('A survenit o problemă la interogarea grafului.');
            if (isEditMode) showToast('A survenit o problemă la interogarea grafului.', 'error');
        }
    } catch (error) {
        console.error('Eroare la încărcare.', error);
        if (isEditMode) showToast('Eroare la încărcare.', 'error');
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

/**
 * Funcția de afișare a notificărilor personalizate (Toast temporar)
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    
    // Culori în funcție de tip
    if (type === 'error') toast.style.backgroundColor = '#f44336';
    else if (type === 'warning') toast.style.backgroundColor = '#ff9800';
    else if (type === 'info') toast.style.backgroundColor = '#2196F3';
    else toast.style.backgroundColor = '#4CAF50'; // success default
    
    toast.style.color = 'white';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '5px';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    toast.style.zIndex = '10000';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.style.transition = 'opacity 0.5s ease-in-out';
    toast.style.opacity = '0';
    
    document.body.appendChild(toast);
    
    // Trigger render pentru a rula tranziția
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // Ascunde automat după 5 secunde
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500); // curăță DOM-ul
    }, 5000);
}