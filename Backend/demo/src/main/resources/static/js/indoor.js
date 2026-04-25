
window.floorData = window.floorData || {};
function initIndoorManager() {
    console.log("Indoor Manager Initialized");
    loadIndoorData();
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
    setTimeout(() => modal.classList.add('open'), 10);
}
function closeFloorManager() {
    const modal = document.getElementById('floor-manager-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
}
function populateBuildingSelect() {
    const select = document.getElementById('floor-manager-building-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Select a Building --</option>';
    if (window.campusData && window.campusData.buildings) {
        window.campusData.buildings.forEach((building, index) => {
            const option = document.createElement('option');
            option.value = index; 
            option.textContent = building.name;
            select.appendChild(option);
        });
    } else {
        console.warn("Campus data not loaded or empty");
    }
    select.onchange = handleBuildingChange;
}
function handleBuildingChange(e) {
    const buildingIndex = e.target.value;
    const controls = document.getElementById('floor-manager-controls');
    const floorListContainer = document.getElementById('floor-manager-list');
    if (buildingIndex === "" || buildingIndex === null) {
        if (controls) controls.style.display = 'none';
        if (floorListContainer) floorListContainer.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">Select a building to view floors.</p>';
        return;
    }
    const building = window.campusData.buildings[buildingIndex];
    if (controls) controls.style.display = 'block';
    if (!window.floorData[building.name]) {
        const initialFloors = building.floors || 1; 
        window.floorData[building.name] = {
            count: initialFloors,
            floors: []
        };
        for (let i = 0; i < window.floorData[building.name].count; i++) {
             window.floorData[building.name].floors.push({ 
                 id: i, 
                 label: `Etaj ${i}` // "Floor" in Romanian to match user language
             });
        }
    }
    const countInput = document.getElementById('floor-manager-count');
    if (countInput) countInput.value = window.floorData[building.name].count;
    renderFloorList(building.name);
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
        for (let i = currentCount; i < newCount; i++) {
            currentData.floors.push({ id: i, label: `Etaj ${i}` });
        }
    } else if (newCount < currentCount) {
        currentData.floors.length = newCount;
    }
    currentData.count = newCount;
    renderFloorList(buildingName);
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
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editeaza Plan'; // "Edit Plan"
        editBtn.style.cssText = 'background: #2ecc71; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; transition: background 0.2s;';
        editBtn.onmouseover = () => editBtn.style.background = '#27ae60';
        editBtn.onmouseout = () => editBtn.style.background = '#2ecc71';
        editBtn.onclick = () => openFloorPlanEditor(buildingName, index);
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
let indoorMap = null;
let currentIndoorBuilding = null;
let currentIndoorFloor = null;
let indoorLayers = null;
function initIndoorMap() {
    if (indoorMap) return; // Already initialized
    indoorMap = L.map('indoor-map', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2,
        zoomControl: true,
        attributionControl: false
    });
    const bounds = [[0,0], [1000,1000]];
    L.rectangle(bounds, {color: "#999", weight: 1, fill: false}).addTo(indoorMap);
    indoorMap.fitBounds(bounds);
    indoorLayers = L.featureGroup().addTo(indoorMap);
    indoorMap.pm.setGlobalOptions({
        layerGroup: indoorLayers,
        snappable: true,
        snapDistance: 20
    });
}
function openFloorPlanEditor(buildingName, floorIndex) {
    closeFloorManager();
    const modal = document.getElementById('indoor-modal');
    if (!modal) return;
    const title = document.getElementById('indoor-title');
    if (title) title.textContent = `${buildingName} - Etaj ${floorIndex} (Editor)`;
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
        loadFloorData(buildingName, floorIndex);
        enableEditorTools();
        generateFloorSwitcher(buildingName, true);
    }, 10);
}
function openFloorPlanViewer(buildingName, floorIndex) {
    closeFloorManager();
    const modal = document.getElementById('indoor-modal');
    if (!modal) return;
    const title = document.getElementById('indoor-title');
    if (title) title.textContent = `${buildingName} - Etaj ${floorIndex}`;
    const saveBtn = document.getElementById('indoor-save-btn');
    if (saveBtn) saveBtn.style.display = 'none';
    currentIndoorBuilding = buildingName;
    currentIndoorFloor = floorIndex;
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('open');
        initIndoorMap();
        indoorMap.invalidateSize();
        loadFloorData(buildingName, floorIndex);
        disableEditorTools();
        generateFloorSwitcher(buildingName, false);
    }, 10);
}
function generateFloorSwitcher(buildingName, isEditor) {
    const controlsContainer = document.getElementById('indoor-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!window.floorData[buildingName]) {
        let fCount = 1;
        if (window.campusData && window.campusData.buildings) {
            const b = window.campusData.buildings.find(b => b.name === buildingName);
            if (b && b.floors) fCount = b.floors;
        }
        window.floorData[buildingName] = { count: fCount, floors: [] };
        for(let i=0; i<fCount; i++) {
            window.floorData[buildingName].floors.push({ id: i, label: `Etaj ${i}` });
        }
    }
    const floors = window.floorData[buildingName].floors;
    if (!floors || floors.length === 0) return;
    floors.forEach(floor => {
        const btn = document.createElement('button');
        btn.className = 'floor-btn';
        if (floor.id === currentIndoorFloor) btn.classList.add('active');
        btn.textContent = floor.label || `Etaj ${floor.id}`;
        btn.onclick = () => {
             const btns = controlsContainer.getElementsByClassName('floor-btn');
             for(let b of btns) b.classList.remove('active');
            btn.classList.add('active');
            currentIndoorFloor = floor.id;
            if (isEditor) {
                document.getElementById('indoor-title').textContent = `${buildingName} - Etaj ${floor.id} (Editor)`;
            } else {
                document.getElementById('indoor-title').textContent = `${buildingName} - Etaj ${floor.id}`;
            }
            loadFloorData(buildingName, floor.id);
        };
        controlsContainer.appendChild(btn);
    });
}
function enableEditorTools() {
    if (!indoorMap) return;
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
    const geoJson = indoorLayers.toGeoJSON();
    const bData = window.floorData[currentIndoorBuilding];
    if (bData && bData.floors) {
        const floorObj = bData.floors.find(f => f.id == currentIndoorFloor);
        if (floorObj) {
            floorObj.geoJson = geoJson;
            console.log("Saved floor plan:", floorObj);
            if (confirm("Planul a fost actualizat in memorie. Vrei sa descarci fisierul JSON pentru a salva permanent modificarile? (Trebuie sa inlocuiesti manual 'data/indoor-data.json' cu acest fisier)")) {
                exportIndoorData();
            } else {
                alert("Plan salvat in memorie! Atentie: Modificarile se vor pierde la refresh daca nu descarci JSON-ul.");
            }
        }
    }
}
function exportIndoorData() {
    const dataStr = JSON.stringify(window.floorData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "indoor-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function loadIndoorData() {
    fetch('data/indoor-data.json')
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            if (data && Object.keys(data).length > 0) {
                console.log("Loaded indoor data from file:", data);
                window.floorData = data;
            }
        })
        .catch(error => {
            console.log("No existing indoor data found or error loading:", error);
            if (!window.floorData) window.floorData = {};
        });
}
function loadFloorData(buildingName, floorIndex) {
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
window.openFloorManager = openFloorManager;
window.closeFloorManager = closeFloorManager;
window.initIndoorManager = initIndoorManager;
document.addEventListener('DOMContentLoaded', () => {
    loadIndoorData();
    initIndoorManager();
});
window.closeIndoor = function() {
    const modal = document.getElementById('indoor-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};
window.openFloorsForBuilding = function(buildingName) {
    openFloorManager();
    const select = document.getElementById('floor-manager-building-select');
    if (select) {
        for (let i=0; i<select.options.length; i++) {
            if (select.options[i].text === buildingName) {
                select.value = select.options[i].value;
                select.dispatchEvent(new Event('change'));
                break;
            }
        }
    }
};
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndoorManager);
} else {
    initIndoorManager();
}