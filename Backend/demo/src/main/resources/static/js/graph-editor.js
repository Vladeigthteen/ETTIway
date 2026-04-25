
const API_SAVE_ENDPOINT = '/api/graph/save';
const API_LOAD_ENDPOINT = '/api/graph/load';
function initGraphEditor(map, drawnItems) {
    const params = new URLSearchParams(window.location.search);
    const isEditMode = params.get('edit') === '1';
    if (!isEditMode) {
        console.log("Graph Editor UI disabled (edit mode off). Pre-loading navigation graph in memory...");
        loadGraph(drawnItems);
        return;
    }
    map.pm.setGlobalOptions({
        layerGroup: drawnItems,
        snappable: true,
        snapDistance: 20,
        snapMiddle: false,
        allowSelfIntersection: true,
        editable: true
    });
    map.pm.addControls({
        position: 'topleft',
        drawMarker: true,
        drawPolyline: true,
        editMode: true,
        dragMode: true,
        removalMode: true
    });
    addCustomControls(map, drawnItems);
    console.log("Graph Editor Initialized");
}
function addCustomControls(map, drawnItems) {
    const Control = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control admin-graph-controls');
            const eraseBtn = document.createElement('button');
            eraseBtn.innerHTML = '🗑️ Erase Graph';
            eraseBtn.className = 'admin-btn erase-btn';
            eraseBtn.onclick = () => eraseGraph(drawnItems);
            const saveBtn = document.createElement('button');
            saveBtn.innerText = '💾 Save Graph';
            saveBtn.className = 'admin-btn';
            saveBtn.onclick = () => saveGraph(drawnItems);
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
async function eraseGraph(drawnItems) {
    if (!confirm('Ești sigur că vrei să ștergi permanent întregul graf din baza de date? Această acțiune este ireversibilă!')) {
        return;
    }
    drawnItems.clearLayers();
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
async function saveGraph(drawnItems) {
    let geoJSON = drawnItems.toGeoJSON();
    if (geoJSON && geoJSON.features) {
        geoJSON.features = geoJSON.features.filter(f => 
            f.geometry.type === 'Point' || f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
        );
    }
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
async function loadGraph(drawnItems) {
    const isEditMode = new URLSearchParams(window.location.search).get('edit') === '1';
    try {
        const response = await fetch(API_LOAD_ENDPOINT);
        if (response.ok) {
            const textJSON = await response.text();
            if (isEditMode && drawnItems) {
                drawnItems.clearLayers();
            }
            if (!textJSON || textJSON.trim() === '{}' || textJSON.trim() === '') {
                window.navigationData = null;
                if (isEditMode) showToast('Nu există graf salvat (Harta este goală).', 'info');
                return;
            }
            const geoJSON = JSON.parse(textJSON);
            window.navigationData = geoJSON;
            if (!geoJSON || Object.keys(geoJSON).length === 0 || (geoJSON.features && geoJSON.features.length === 0)) {
                if (isEditMode) showToast('Nu există elemente în graful salvat anterior.', 'info');
                return;
            }
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
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
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
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500); // curăță DOM-ul
    }, 5000);
}