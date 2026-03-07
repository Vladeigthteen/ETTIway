/**
 * js/indoor.js - Logic for indoor floor management
 */

// Global variable to store floor data temporarily (in-memory)
// In a real application, this would sync with the backend
window.floorData = window.floorData || {};

function initIndoorManager() {
    console.log("Indoor Manager Initialized");
    // Ensure modal is hidden initially
    const modal = document.getElementById('floor-manager-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
    }
}

function openFloorManager() {
    const modal = document.getElementById('floor-manager-modal');
    if (!modal) return;
    
    populateBuildingSelect();
    modal.style.display = 'block';
    // Small delay to allow display:block to apply before adding class for opacity transition
    setTimeout(() => modal.classList.add('open'), 10);
}

function closeFloorManager() {
    const modal = document.getElementById('floor-manager-modal');
    if (!modal) return;
    
    modal.classList.remove('open');
    // Wait for transition to finish
    setTimeout(() => modal.style.display = 'none', 300);
}

function populateBuildingSelect() {
    const select = document.getElementById('floor-manager-building-select');
    if (!select) return;
    
    // Clear existing options except default
    select.innerHTML = '<option value="">-- Select a Building --</option>';
    
    if (window.campusData && window.campusData.buildings) {
        window.campusData.buildings.forEach((building, index) => {
            const option = document.createElement('option');
            // Store the index to easily retrieve the building object later
            option.value = index; 
            option.textContent = building.name;
            select.appendChild(option);
        });
    } else {
        console.warn("Campus data not loaded or empty");
    }

    // Add change listener
    select.onchange = handleBuildingChange;
}

function handleBuildingChange(e) {
    const buildingIndex = e.target.value;
    const controls = document.getElementById('floor-manager-controls');
    const floorListContainer = document.getElementById('floor-manager-list');
    
    // Reset inputs if no building selected
    if (buildingIndex === "" || buildingIndex === null) {
        if (controls) controls.style.display = 'none';
        if (floorListContainer) floorListContainer.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">Select a building to view floors.</p>';
        return;
    }

    const building = window.campusData.buildings[buildingIndex];
    if (controls) controls.style.display = 'block';
    
    // Initialize or load floor data for this building if not present in our temporary store
    // Check if the original data had floors and use that as initial state
    if (!window.floorData[building.name]) {
        // Default to what's in JSON or 1 if missing
        const initialFloors = building.floors || 1; 
        window.floorData[building.name] = {
            count: initialFloors,
            floors: []
        };
        
        // Initialize floor objects
        for (let i = 0; i < window.floorData[building.name].count; i++) {
             window.floorData[building.name].floors.push({ 
                 id: i, 
                 label: `Etaj ${i}` // "Floor" in Romanian to match user language
             });
        }
    }

    // Update input value
    const countInput = document.getElementById('floor-manager-count');
    if (countInput) countInput.value = window.floorData[building.name].count;
    
    renderFloorList(building.name);
    
    // Setup Update button
    const updateBtn = document.getElementById('floor-manager-update-btn');
    if (updateBtn) {
        updateBtn.onclick = () => {
            const count = parseInt(document.getElementById('floor-manager-count').value);
            if (count > 0) {
                updateFloors(building.name, count);
            } else {
                alert("Please enter a valid number of floors (>0)");
            }
        };
    }
}

function updateFloors(buildingName, newCount) {
    const currentData = window.floorData[buildingName];
    const currentCount = currentData.count;
    
    if (newCount > currentCount) {
        // Add floors (append)
        for (let i = currentCount; i < newCount; i++) {
            currentData.floors.push({ id: i, label: `Etaj ${i}` });
        }
    } else if (newCount < currentCount) {
        // Remove floors (from the top/end)
        // Adjust length of array
        currentData.floors.length = newCount;
    }
    
    currentData.count = newCount;
    renderFloorList(buildingName);
    
    // Feedback to user
    // alert(`Updated ${buildingName} to have ${newCount} floors.`);
    console.log(`Updated ${buildingName}: ${newCount} floors`);
}

function renderFloorList(buildingName) {
    const listContainer = document.getElementById('floor-manager-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const floors = window.floorData[buildingName].floors;
    
    floors.forEach((floor, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 10px; background: #ecf0f1; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #bdc3c7;';
        
        const label = document.createElement('span');
        label.style.fontWeight = 'bold';
        label.textContent = floor.label || `Etaj ${index}`;
        
        // Button to "go to separate page" (edit floor plan)
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editeaza Plan'; // "Edit Plan"
        editBtn.style.cssText = 'background: #2ecc71; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; transition: background 0.2s;';
        editBtn.onmouseover = () => editBtn.style.background = '#27ae60';
        editBtn.onmouseout = () => editBtn.style.background = '#2ecc71';
        
        editBtn.onclick = () => openFloorPlanEditor(buildingName, index);
        
        // Add View button for normal users/preview
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Vezi Plan'; // "View Plan"
        viewBtn.style.cssText = 'background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; margin-right: 5px;';
        viewBtn.onclick = () => openFloorPlanViewer(buildingName, index);
        
        const btnContainer = document.createElement('div');
        btnContainer.appendChild(viewBtn);
        btnContainer.appendChild(editBtn);
        
        item.appendChild(label);
        item.appendChild(btnContainer);
        listContainer.appendChild(item);
    });
}

// --- Indoor Map & Editor Logic ---
let indoorMap = null;
let currentIndoorBuilding = null;
let currentIndoorFloor = null;
// Layer groups
let indoorLayers = null;

function initIndoorMap() {
    if (indoorMap) return; // Already initialized

    // Initialize map in the #indoor-map div
    indoorMap = L.map('indoor-map', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2,
        zoomControl: true,
        attributionControl: false
    });

    const bounds = [[0,0], [1000,1000]];
    // Use an image overlay or just a white rect
    L.rectangle(bounds, {color: "#999", weight: 1, fill: false}).addTo(indoorMap);
    indoorMap.fitBounds(bounds);

    indoorLayers = L.featureGroup().addTo(indoorMap);

    // Setup Geoman global options
    indoorMap.pm.setGlobalOptions({
        layerGroup: indoorLayers,
        snappable: true,
        snapDistance: 20
    });
}

function openFloorPlanEditor(buildingName, floorIndex) {
    closeFloorManager();
    // Open the main indoor modal
    const modal = document.getElementById('indoor-modal');
    if (!modal) return;
    
    // Update title
    const title = document.getElementById('indoor-title');
    if (title) title.textContent = `${buildingName} - Etaj ${floorIndex} (Editor)`;
    
    // Show save button
    const saveBtn = document.getElementById('indoor-save-btn');
    if (saveBtn) {
        saveBtn.style.display = 'inline-block';
        saveBtn.onclick = () => saveCurrentFloorPlan(); 
    }

    currentIndoorBuilding = buildingName;
    currentIndoorFloor = floorIndex;

    modal.style.display = 'flex'; // or block based on CSS
    setTimeout(() => {
        modal.classList.add('open');
        initIndoorMap();
        indoorMap.invalidateSize();
        
        // Load data
        loadFloorData(buildingName, floorIndex);
        
        // Enable editing tools
        enableEditorTools();
        
        // Generate floor switcher controls (Editor mode maybe simpler or same as viewer)
        generateFloorSwitcher(buildingName, true);
    }, 10);
}

function openFloorPlanViewer(buildingName, floorIndex) {
    closeFloorManager();
    const modal = document.getElementById('indoor-modal');
    if (!modal) return;

    const title = document.getElementById('indoor-title');
    if (title) title.textContent = `${buildingName} - Etaj ${floorIndex}`;

    // Hide save button
    const saveBtn = document.getElementById('indoor-save-btn');
    if (saveBtn) saveBtn.style.display = 'none';

    currentIndoorBuilding = buildingName;
    currentIndoorFloor = floorIndex;

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('open');
        initIndoorMap();
        indoorMap.invalidateSize();
        
        // Load data
        loadFloorData(buildingName, floorIndex);
        
        // Disable editing tools
        disableEditorTools();
        
        // Generate floor switcher controls
        generateFloorSwitcher(buildingName, false);
    }, 10);
}

function generateFloorSwitcher(buildingName, isEditor) {
    const controlsContainer = document.getElementById('indoor-controls');
    if (!controlsContainer) return;
    
    controlsContainer.innerHTML = '';
    
    // Check if floorData exists for this building, if not init
    if (!window.floorData[buildingName]) {
        // Find how many floors from building list
        let fCount = 1;
        if (window.campusData && window.campusData.buildings) {
            const b = window.campusData.buildings.find(b => b.name === buildingName);
            // Use the floors property if available, otherwise default to 1 (Parter)
            if (b && b.floors) fCount = b.floors;
        }
        
        window.floorData[buildingName] = { count: fCount, floors: [] };
        // Create floors structure
        for(let i=0; i<fCount; i++) {
            window.floorData[buildingName].floors.push({ id: i, label: `Etaj ${i}` });
        }
    }
    
    const floors = window.floorData[buildingName].floors;
    
    if (!floors || floors.length === 0) return;
    
    // Create button for each floor
    floors.forEach(floor => {
        const btn = document.createElement('button');
        btn.className = 'floor-btn';
        if (floor.id === currentIndoorFloor) btn.classList.add('active');
        btn.textContent = floor.label || `Etaj ${floor.id}`;
        
        btn.onclick = () => {
            // Update active state visually
            // document.querySelectorAll('#floor-btn').forEach(b => b.classList.remove('active')); 
            // Actually selector should be .floor-btn within #indoor-controls
             const btns = controlsContainer.getElementsByClassName('floor-btn');
             for(let b of btns) b.classList.remove('active');
            
            btn.classList.add('active');
            
            // Switch floor content
            currentIndoorFloor = floor.id;
            
            if (isEditor) {
                document.getElementById('indoor-title').textContent = `${buildingName} - Etaj ${floor.id} (Editor)`;
            } else {
                document.getElementById('indoor-title').textContent = `${buildingName} - Etaj ${floor.id}`;
            }
            
            // Load the map data for the new floor
            loadFloorData(buildingName, floor.id);
        };
        
        controlsContainer.appendChild(btn);
    });
}


function enableEditorTools() {
    if (!indoorMap) return;
    
    // Add Geoman controls
    indoorMap.pm.addControls({
        position: 'topleft',
        drawMarker: true,
        drawCircleMarker: false,
        drawPolyline: true,
        drawRectangle: true,
        drawPolygon: true,
        drawCircle: false,
        drawText: false,
        editMode: true,
        dragMode: true,
        cutPolygon: false,
        removalMode: true,
        rotateMode: false
    });
}

function disableEditorTools() {
    if (!indoorMap) return;
    indoorMap.pm.removeControls();
    indoorMap.pm.disableGlobalEditMode();
}

function saveCurrentFloorPlan() {
    if (!window.floorData || !currentIndoorBuilding) return; // Should exist if we are here
    
    // Get GeoJSON from drawn layers
    const geoJson = indoorLayers.toGeoJSON();
    
    // Find the floor object in our data structure
    const bData = window.floorData[currentIndoorBuilding];
    if (bData && bData.floors) {
        const floorObj = bData.floors.find(f => f.id == currentIndoorFloor);
        if (floorObj) {
            floorObj.geoJson = geoJson;
            console.log("Saved floor plan:", floorObj);
            alert("Plan salvat cu succes!");
        }
    }
}

function loadFloorData(buildingName, floorIndex) {
    // Clear existing
    indoorLayers.clearLayers();

    if (!window.floorData) return;
    const bData = window.floorData[buildingName];
    if (bData && bData.floors) {
        const floorObj = bData.floors.find(f => f.id == floorIndex);
        if (floorObj && floorObj.geoJson) {
            L.geoJSON(floorObj.geoJson).eachLayer(layer => {
                indoorLayers.addLayer(layer);
            });
        }
    }
}

// Make available globally
window.openFloorManager = openFloorManager;
window.closeFloorManager = closeFloorManager;
window.initIndoorManager = initIndoorManager;
window.closeIndoor = function() {
    const modal = document.getElementById('indoor-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};

// Also expose this helper since map.js might use it (based on previous requests)
window.openFloorsForBuilding = function(buildingName) {
    openFloorManager();
    const select = document.getElementById('floor-manager-building-select');
    if (select) {
        // Simple search for option
        for (let i=0; i<select.options.length; i++) {
            if (select.options[i].text === buildingName) {
                select.value = select.options[i].value;
                select.dispatchEvent(new Event('change'));
                break;
            }
        }
    }
};

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndoorManager);
} else {
    initIndoorManager();
}