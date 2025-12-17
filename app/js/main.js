/**
 * main.js - Main application logic for ETTIway
 * Handles initialization, data loading, and UI interactions
 */

// Configuration constants
const CAMPUS_DATA_FILE = 'data/campus.sample.json';

/**
 * Load campus data from JSON file
 * @returns {Promise<Object>} Promise resolving to object with campus info and buildings array
 */
async function loadCampusData() {
    try {
        const response = await fetch(CAMPUS_DATA_FILE);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Campus data loaded successfully', data);
        return data;
    } catch (error) {
        console.error('Error loading campus data:', error);
        // Return empty object on error
        return { campus: null, buildings: [] };
    }
}

/**
 * Populate the building list in the sidebar
 * @param {Array} buildings - Array of building objects
 */
function populateBuildingList(buildings) {
    const listContainer = document.getElementById('room-list-container');
    
    if (!buildings || buildings.length === 0) {
        listContainer.innerHTML = '<p class="info-text">No buildings available</p>';
        return;
    }
    
    // Clear existing content
    listContainer.innerHTML = '';
    
    // Create list items for each building
    buildings.forEach(building => {
        const item = document.createElement('div');
        item.className = 'room-item'; // Keeping class name for style compatibility
        
        // Use escaped HTML to prevent XSS
        item.innerHTML = `
            <div class="room-item-name">${escapeHtml(building.name)}</div>
            <div class="room-item-building">${escapeHtml(building.description)}</div>
        `;
        
        // Add click handler to focus on building
        item.addEventListener('click', () => {
            focusOnBuilding(building);
            displayBuildingDetails(building);
        });
        
        listContainer.appendChild(item);
    });
    
    console.log(`Populated list with ${buildings.length} buildings`);
}

/**
 * Initialize search functionality (UI only, no actual filtering)
 * Placeholder for future search implementation
 */
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    
    // Add placeholder event listener for future functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        console.log('Search term:', searchTerm);
        // Note: Actual search functionality can be implemented here in the future
        // For now, this is UI only as per requirements
    });
    
    console.log('Search input initialized (UI only)');
}

/**
 * Main initialization function
 * Called when the DOM is fully loaded
 */
async function initialize() {
    console.log('Initializing ETTIway application...');
    
    // Load campus data first
    const data = await loadCampusData();
    
    // Initialize the map with campus center coordinates if available
    if (data.campus && data.campus.location) {
        initializeMap(
            data.campus.location.latitude,
            data.campus.location.longitude
        );
    } else {
        initializeMap();
    }
    
    // Draw campus boundary if available
    if (data.campus && data.campus.boundary) {
        drawCampusBoundary(data.campus.boundary);
    }
    
    // Load buildings onto the map
    if (data.buildings) {
        loadBuildingPolygons(data.buildings);
        populateBuildingList(data.buildings);
    }

    // Draw entrances (gates, parking access) if present in the data
    if (data.entrances) {
        try {
            drawEntrances(data.entrances);
        } catch (e) {
            console.warn('Error drawing entrances:', e);
        }
    }
    // Render missing roads (data.paths) into missingRoadsLayer for routing/visualization
    try {
        if (window.renderPathsFromData) window.renderPathsFromData(data);
    } catch (e) {
        console.warn('Error rendering paths from data', e);
    }
    
    // Initialize UI components
    initializeSearch();

    // Create draw controls in the sidebar
    createDrawControls();
    // Create layer toggle checkboxes (missing roads, edit mode)
    createLayerToggles();
    // Create runtime-added paths list UI
    createRuntimePathList();
}

/**
 * createDrawControls - add drawing buttons to the sidebar and wire them
 */
function createDrawControls() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Create container
    const container = document.createElement('div');
    container.id = 'draw-controls';
    container.className = 'draw-controls';

    container.innerHTML = `
        <h3 style="padding:12px 20px; color:#bdc3c7;">Path Drawing</h3>
        <div class="draw-buttons" style="padding:0 20px 20px 20px; display:flex; gap:8px; flex-wrap:wrap;">
            <button id="btn-start" class="draw-btn">Start drawing</button>
            <button id="btn-stop" class="draw-btn">Stop drawing</button>
            <button id="btn-undo" class="draw-btn">Undo</button>
            <button id="btn-clear" class="draw-btn">Clear</button>
            <button id="btn-export" class="draw-btn">Finish & Export</button>
        </div>
    `;

    // Insert near top but after search container
    const search = document.querySelector('.search-container');
    if (search && search.parentNode) {
        search.parentNode.insertBefore(container, search.nextSibling);
    } else {
        sidebar.insertBefore(container, sidebar.firstChild);
    }

    // Wire up buttons
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const btnUndo = document.getElementById('btn-undo');
    const btnClear = document.getElementById('btn-clear');
    const btnExport = document.getElementById('btn-export');

    // Buttons are disabled by default; enabled when 'Mod editare trasee' is ON
    [btnStart, btnStop, btnUndo, btnClear, btnExport].forEach(b => { if (b) b.disabled = true; });

    btnStart.addEventListener('click', () => { if (window.enableDrawMode) window.enableDrawMode(); });
    btnStop.addEventListener('click', () => { if (window.disableDrawMode) window.disableDrawMode(); });
    btnUndo.addEventListener('click', () => { if (window.undoLastPoint) window.undoLastPoint(); });
    btnClear.addEventListener('click', () => { if (window.clearCurrentPath) window.clearCurrentPath(); });
    btnExport.addEventListener('click', () => { if (window.exportCurrentPath) window.exportCurrentPath(); });
}

/**
 * createLayerToggles - add checkboxes to show/hide missingRoadsLayer and toggle Edit Mode
 * - "Afișează drumuri completate" (missingRoadsLayer) default ON
 * - "Mod editare trasee" (drawnPathsLayer + enable drawing buttons) default OFF
 */
function createLayerToggles() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const container = document.createElement('div');
    container.id = 'layer-toggles';
    container.className = 'layer-toggles';
    container.style.padding = '10px 20px';
    container.innerHTML = `
        <div style="color:#bdc3c7; margin-bottom:6px; font-weight:600;">Straturi hartă</div>
        <label style="display:block; color:#ecf0f1; margin-bottom:6px;"><input type="checkbox" id="chk-missing" checked> Afișează drumuri completate</label>
        <label style="display:block; color:#ecf0f1;"><input type="checkbox" id="chk-edit" > Mod editare trasee</label>
    `;

    // insert after draw controls
    const drawControls = document.getElementById('draw-controls');
    if (drawControls && drawControls.parentNode) drawControls.parentNode.insertBefore(container, drawControls.nextSibling);
    else sidebar.appendChild(container);

    const chkMissing = document.getElementById('chk-missing');
    const chkEdit = document.getElementById('chk-edit');

    // cached button refs
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const btnUndo = document.getElementById('btn-undo');
    const btnClear = document.getElementById('btn-clear');
    const btnExport = document.getElementById('btn-export');
    const editButtons = [btnStart, btnStop, btnUndo, btnClear, btnExport].filter(Boolean);

    function setMissingVisible(visible) {
        try {
            if (!window.missingRoadsLayer) return;
            if (visible) campusMap.addLayer(window.missingRoadsLayer);
            else campusMap.removeLayer(window.missingRoadsLayer);
        } catch (e) { console.warn(e); }
    }

    function setEditMode(enabled) {
        try {
            // toggle drawnPathsLayer visibility
            if (!window.drawnPathsLayer) return;
            if (enabled) campusMap.addLayer(window.drawnPathsLayer);
            else campusMap.removeLayer(window.drawnPathsLayer);

            // enable/disable draw buttons
            editButtons.forEach(b => { b.disabled = !enabled; });
        } catch (e) { console.warn(e); }
    }

    // wire events
    chkMissing.addEventListener('change', (e) => setMissingVisible(e.target.checked));
    chkEdit.addEventListener('change', (e) => setEditMode(e.target.checked));

    // initialize defaults: missing ON, edit OFF
    setMissingVisible(true);
    setEditMode(false);
}

/**
 * createRuntimePathList - create a small UI list in the sidebar that shows
 * paths added during the current session (window.runtimePaths). Each item
 * has a Delete button to remove it from the map/session and a Copy button to
 * copy the path JSON to clipboard for manual persistence.
 */
function createRuntimePathList() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // container
    const container = document.createElement('div');
    container.id = 'runtime-paths';
    container.className = 'runtime-paths';
    container.style.padding = '10px 20px';
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="color:#bdc3c7; font-weight:600;">Trasee adăugate</div>
            <div>
                <button id="btn-export-all" class="runtime-btn" style="margin-right:6px;">Export all</button>
                <button id="btn-clear-persist" class="runtime-btn runtime-delete">Clear persisted</button>
            </div>
        </div>
        <div id="runtime-paths-list">
            <div class="info-text">Niciun traseu adăugat în sesiune</div>
        </div>
    `;

    // insert after layer toggles if present
    const toggles = document.getElementById('layer-toggles');
    if (toggles && toggles.parentNode) toggles.parentNode.insertBefore(container, toggles.nextSibling);
    else sidebar.appendChild(container);

    const listEl = document.getElementById('runtime-paths-list');

    // function to rebuild list from window.runtimePaths
    function rebuild() {
        const paths = (window.runtimePaths || []);
        listEl.innerHTML = '';
        if (!paths || paths.length === 0) {
            listEl.innerHTML = '<div class="info-text">Niciun traseu adăugat în sesiune</div>';
            return;
        }

        paths.forEach(p => {
            const item = document.createElement('div');
            item.className = 'runtime-item';
            const title = document.createElement('div');
            title.className = 'runtime-item-title';
            title.textContent = `${p.id} — ${p.type || 'path'}`;

            const actions = document.createElement('div');
            actions.className = 'runtime-item-actions';

            const btnCopy = document.createElement('button');
            btnCopy.className = 'runtime-btn runtime-copy';
            btnCopy.textContent = 'Copy JSON';
            btnCopy.addEventListener('click', async () => {
                try {
                    const json = JSON.stringify(p, null, 2);
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(json);
                        alert('JSON copiat în clipboard');
                    } else {
                        // fallback: show in prompt
                        prompt('Copiează manual acest JSON:', json);
                    }
                } catch (e) {
                    console.warn('Copy failed', e);
                    alert('Copiere eșuată');
                }
            });

            const btnDelete = document.createElement('button');
            btnDelete.className = 'runtime-btn runtime-delete';
            btnDelete.textContent = 'Șterge';
            btnDelete.addEventListener('click', () => {
                if (!p.id) return;
                if (confirm(`Ștergi traseul ${p.id}?`)) {
                    if (window.removePathById) window.removePathById(p.id);
                }
            });

            actions.appendChild(btnCopy);
            actions.appendChild(btnDelete);

            item.appendChild(title);
            item.appendChild(actions);
            listEl.appendChild(item);
        });
    }

    // initial build
    rebuild();

        // wire export/clear buttons
        const btnExportAll = document.getElementById('btn-export-all');
        const btnClearPersist = document.getElementById('btn-clear-persist');
        if (btnExportAll) btnExportAll.addEventListener('click', () => { if (window.exportAllRuntimePaths) window.exportAllRuntimePaths(); });
        if (btnClearPersist) btnClearPersist.addEventListener('click', () => {
            if (confirm('Ștergi toate traseele persistente din browser?')) {
                if (window.clearPersistedRuntimePaths) window.clearPersistedRuntimePaths();
            }
        });

    // listen for updates from map.js (adds/removes dispatch 'pathsUpdated')
    window.addEventListener('pathsUpdated', rebuild);
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
