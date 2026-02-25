/**
 * graph-editor.js - Graph Editor for Navigation
 * Allows drawing nodes (markers) and edges (polylines) with snapping.
 * Features: Draw, Edit, Delete, Undo/Redo, Save to Backend.
 */

const API_ENDPOINT = '/api/graph'; // Backend endpoint

/**
 * Initialize the Graph Editor
 * @param {L.Map} map - Leaflet map instance
 * @param {L.FeatureGroup} drawnItems - Feature group to store graph elements
 */
function initGraphEditor(map, drawnItems) {
    // 1. Configure Geoman for Graph Editing (Strict snapping)
    map.pm.setGlobalOptions({
        layerGroup: drawnItems,
        snappable: true,
        snapDistance: 20,
        snapMiddle: false, // Snap only to vertices/markers (nodes), not middle of lines
        allowSelfIntersection: true,
        templineStyle: { color: 'red' },
        hintlineStyle: { color: 'red', dashArray: [5, 5] },
        editable: true
    });

    // 2. Add Controls
    map.pm.addControls({
        position: 'topleft',
        drawMarker: true,   // Nodes
        drawPolyline: true, // Edges
        drawCircle: false,
        drawCircleMarker: false,
        drawRectangle: false,
        drawPolygon: false,
        drawText: false,
        cutPolygon: false,
        rotateMode: false,
        editMode: true,
        dragMode: true,
        removalMode: true
    });

    // 3. Add Custom Save/Load Controls
    addCustomControls(map, drawnItems);

    // 4. Handle connection events (optional: enforce connectivity logic here if needed)
    map.on('pm:create', (e) => {
        // e.layer is the newly created layer
        // You could add properties like 'id' here
        if (e.shape === 'Marker') {
            e.layer.feature = e.layer.feature || {};
            e.layer.feature.properties = e.layer.feature.properties || {};
            e.layer.feature.properties.type = 'node';
        } else if (e.shape === 'Line') {
            e.layer.feature = e.layer.feature || {};
            e.layer.feature.properties = e.layer.feature.properties || {};
            e.layer.feature.properties.type = 'edge';
        }
    });

    console.log("Graph Editor Initialized");
}

function addCustomControls(map, drawnItems) {
    const Control = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.padding = '5px';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '5px';

            const saveBtn = document.createElement('button');
            saveBtn.innerText = 'Save Graph';
            saveBtn.style.cursor = 'pointer';
            saveBtn.onclick = (e) => {
                L.DomEvent.stop(e);
                saveGraph(drawnItems);
            };

            const loadBtn = document.createElement('button');
            loadBtn.innerText = 'Load Graph';
            loadBtn.style.cursor = 'pointer';
            loadBtn.onclick = (e) => {
                L.DomEvent.stop(e);
                loadGraph(drawnItems);
            };
            
            container.appendChild(saveBtn);
            container.appendChild(loadBtn);

            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });
    map.addControl(new Control());
}

/**
 * Save current graph to backend
 */
async function saveGraph(drawnItems) {
    const geoJSON = drawnItems.toGeoJSON();
    console.log("Saving graph...", geoJSON);

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geoJSON)
        });

        if (response.ok) {
            alert('Graph saved successfully!');
        } else {
            console.warn('Backend not reachable, saving to local file (fallback)');
            downloadJSON(geoJSON, 'graph_data.json');
            alert('Backend error. Downloaded as file instead.');
        }
    } catch (error) {
        console.error('Save failed:', error);
        downloadJSON(geoJSON, 'graph_data.json');
        alert('Network error. Downloaded as file instead.');
    }
}

/**
 * Load graph from backend
 */
async function loadGraph(drawnItems) {
    try {
        const response = await fetch(API_ENDPOINT);
        if (response.ok) {
            const geoJSON = await response.json();
            drawnItems.clearLayers();
            L.geoJSON(geoJSON, {
                onEachFeature: (feature, layer) => {
                    drawnItems.addLayer(layer);
                }
            });
            alert('Graph loaded!');
        } else {
            alert('Could not load graph from backend.');
        }
    } catch (error) {
        console.error('Load failed:', error);
        alert('Network error loading graph.');
    }
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
