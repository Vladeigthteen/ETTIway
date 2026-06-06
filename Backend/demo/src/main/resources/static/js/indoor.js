
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
                showCustomAlert("Please enter a valid number of floors (>0)");
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
let indoorBorderLayer = null;

function getCustomMarkerIcon(typeId) {
    let bgColor = '#3498db'; // Default type 1
    if (typeId === '2') bgColor = '#e67e22'; // Type 2
    if (typeId === '3') bgColor = '#2ecc71'; // Type 3
    
    const htmlString = `<div style="background-color: ${bgColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`;
    
    return L.divIcon({
        className: 'custom-indoor-marker',
        html: htmlString,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        tooltipAnchor: [0, -10]
    });
}

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
    indoorBorderLayer = L.rectangle(bounds, {color: "#999", weight: 1, fill: false});
    indoorBorderLayer.addTo(indoorMap);
    indoorMap.fitBounds(bounds);
    indoorLayers = L.featureGroup().addTo(indoorMap);
    indoorMap.pm.setGlobalOptions({
        layerGroup: indoorLayers,
        snappable: true,
        snapDistance: 20
    });

    // Add legend to map
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'indoor-legend');
        div.style.backgroundColor = 'rgba(255,255,255,0.9)';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
        div.style.fontSize = '12px';
        div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Legendă Markere</div>
            <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #3498db; margin-right: 8px;"></div> Intrare cameră
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #e67e22; margin-right: 8px;"></div> Intersecție coridor
            </div>
            <div style="display: flex; align-items: center;">
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #2ecc71; margin-right: 8px;"></div> Scări
            </div>
        `;
        return div;
    };
    legend.addTo(indoorMap);

    indoorMap.on('pm:create', (e) => {
        const layer = e.layer;
        
        if (e.shape === 'Marker') {
            showMarkerSelectionPrompt((result) => {
                if (result) {
                    layer.feature = layer.feature || { type: "Feature", properties: {} };
                    layer.feature.properties = layer.feature.properties || {};
                    layer.feature.properties.markerType = result.type;
                    layer.feature.properties.name = result.name;
                    
                    const markerIcon = getCustomMarkerIcon(result.type);
                    if (markerIcon) {
                        layer.setIcon(markerIcon);
                    }
                    
                    if (result.name) {
                        layer.bindTooltip(result.name, {
                            permanent: true,
                            direction: "top",
                            className: "marker-tooltip"
                        }).openTooltip();
                    }
                } else {
                    indoorLayers.removeLayer(layer);
                }
            });
        } else {
            showCustomPrompt("Numele camerei / Room name:", (roomName) => {
                if (roomName) {
                    layer.feature = layer.feature || { type: "Feature", properties: {} };
                    layer.feature.properties = layer.feature.properties || {};
                    layer.feature.properties.name = roomName;
                    
                    layer.bindTooltip(roomName, {
                        permanent: true,
                        direction: "center",
                        className: "room-tooltip"
                    }).openTooltip();
                } else {
                    // Remove the drawing if user canceled the naming
                    indoorLayers.removeLayer(layer);
                }
            });
        }
    });
}

function showCustomPrompt(message, callback) {
    let modal = document.getElementById('custom-prompt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-prompt-modal';
        modal.className = 'custom-prompt-modal';
        modal.innerHTML = `
            <div class="custom-prompt-content">
                <h3 id="custom-prompt-message"></h3>
                <input type="text" id="custom-prompt-input" autocomplete="off" />
                <div class="custom-prompt-buttons">
                    <button class="btn-cancel" id="custom-prompt-cancel">Anulează</button>
                    <button class="btn-ok" id="custom-prompt-ok">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('custom-prompt-message').textContent = message;
    const input = document.getElementById('custom-prompt-input');
    input.value = '';
    modal.style.display = 'flex';
    input.focus();

    const btnOk = document.getElementById('custom-prompt-ok');
    const btnCancel = document.getElementById('custom-prompt-cancel');

    // Clean old event listeners by cloning
    const newBtnOk = btnOk.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    newBtnOk.onclick = () => {
        modal.style.display = 'none';
        callback(input.value.trim());
    };

    newBtnCancel.onclick = () => {
        modal.style.display = 'none';
        callback(null);
    };
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') newBtnOk.click();
        if (e.key === 'Escape') newBtnCancel.click();
    };
}

function showCustomAlert(message) {
    let modal = document.getElementById('custom-alert-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-alert-modal';
        modal.className = 'custom-prompt-modal'; // refolosim design-ul din custom prompt
        modal.innerHTML = `
            <div class="custom-prompt-content">
                <h3 id="custom-alert-message" style="margin-bottom: 25px; line-height: 1.4;"></h3>
                <div class="custom-prompt-buttons" style="justify-content: center;">
                    <button class="btn-ok" id="custom-alert-ok" style="max-width: 150px;">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('custom-alert-message').textContent = message;
    modal.style.display = 'flex';

    const btnOk = document.getElementById('custom-alert-ok');
    const newBtnOk = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);

    newBtnOk.onclick = () => {
        modal.style.display = 'none';
    };

    // Apăsarea tastei Enter sau Escape închide alerta
    document.addEventListener('keydown', function tempListener(e) {
        if (modal.style.display === 'flex' && (e.key === 'Enter' || e.key === 'Escape')) {
            newBtnOk.click();
            document.removeEventListener('keydown', tempListener);
        }
    });
}

function showMarkerSelectionPrompt(callback) {
    let modal = document.getElementById('custom-marker-prompt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-marker-prompt-modal';
        modal.className = 'custom-prompt-modal';
        modal.innerHTML = `
            <div class="custom-prompt-content">
                <h3 style="margin-bottom: 20px; font-size: 18px; font-weight: 600;">Setează Marker</h3>
                
                <div style="text-align: left; margin-bottom: 15px;">
                    <label style="font-weight:bold; font-size: 14px;">Tip Marker:</label><br/>
                    <select id="marker-type-select" style="width: 100%; padding: 8px; margin-top: 5px; border-radius: 4px; border: 1px solid #bdc3c7;">
                        <option value="1">1 = Intrare cameră</option>
                        <option value="2">2 = Intersecție coridor</option>
                        <option value="3">3 = Scări</option>
                    </select>
                </div>

                <div style="text-align: left; margin-bottom: 20px;">
                    <label style="font-weight:bold; font-size: 14px;">Nume / Referință (opțional):</label><br/>
                    <input type="text" id="marker-name-input" autocomplete="off" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #bdc3c7; border-radius: 4px;" />
                </div>

                <div class="custom-prompt-buttons">
                    <button class="btn-cancel" id="marker-prompt-cancel">Anulează</button>
                    <button class="btn-ok" id="marker-prompt-ok">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const typeSelect = document.getElementById('marker-type-select');
    const nameInput = document.getElementById('marker-name-input');
    
    typeSelect.value = "1";
    nameInput.value = "";
    
    modal.style.display = 'flex';
    nameInput.focus();

    const btnOk = document.getElementById('marker-prompt-ok');
    const btnCancel = document.getElementById('marker-prompt-cancel');

    const newBtnOk = btnOk.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    newBtnOk.onclick = () => {
        modal.style.display = 'none';
        callback({
            type: typeSelect.value,
            name: nameInput.value.trim()
        });
    };

    newBtnCancel.onclick = () => {
        modal.style.display = 'none';
        callback(null);
    };
    
    nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') newBtnOk.click();
        if (e.key === 'Escape') newBtnCancel.click();
    };
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
        if (indoorBorderLayer && !indoorMap.hasLayer(indoorBorderLayer)) {
            indoorBorderLayer.addTo(indoorMap);
        }
        if (indoorBorderLayer && indoorBorderLayer.pm) {
            indoorBorderLayer.pm.enable({
                allowSelfIntersection: false,
                preventMarkerRemoval: true,
            });
        }
        const zoomCtrl = document.querySelector('#indoor-map .leaflet-control-zoom');
        if (zoomCtrl) zoomCtrl.style.display = 'block';
        indoorMap.scrollWheelZoom.enable();
        indoorMap.touchZoom.enable();
        indoorMap.doubleClickZoom.enable();
        indoorMap.boxZoom.enable();
        indoorMap.invalidateSize();
        loadFloorData(buildingName, floorIndex);
        enableEditorTools();
        generateFloorSwitcher(buildingName, true);
    }, 10);
}
function openFloorPlanViewer(buildingName, floorIndex, roomNameToHighlight = null) {
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
        if (indoorBorderLayer && indoorBorderLayer.pm) {
            indoorBorderLayer.pm.disable();
        }
        if (indoorBorderLayer && indoorMap.hasLayer(indoorBorderLayer)) {
            indoorMap.removeLayer(indoorBorderLayer);
        }
        const zoomCtrl = document.querySelector('#indoor-map .leaflet-control-zoom');
        if (zoomCtrl) zoomCtrl.style.display = 'none';
        indoorMap.scrollWheelZoom.disable();
        indoorMap.touchZoom.disable();
        indoorMap.doubleClickZoom.disable();
        indoorMap.boxZoom.disable();
        indoorMap.invalidateSize();
        loadFloorData(buildingName, floorIndex, roomNameToHighlight);
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
            if (indoorBorderLayer) {
                const b = indoorBorderLayer.getBounds();
                floorObj.bounds = [[b.getSouthWest().lat, b.getSouthWest().lng], [b.getNorthEast().lat, b.getNorthEast().lng]];
            }
            console.log("Saved floor plan:", floorObj);
            saveIndoorDataToDatabase();
        }
    }
}
function saveIndoorDataToDatabase() {
    fetch('/api/indoor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window.floorData)
    })
    .then(response => {
        if (!response.ok) throw new Error("Failed to save to database");
        return response.text();
    })
    .then(msg => {
        showCustomAlert("Plan salvat cu succes ! ");
    })
    .catch(error => {
        console.error("Error saving indoor data:", error);
        showCustomAlert("Eroare la salvarea planului. ");
    });
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
    fetch('/api/indoor/load')
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            if (data && Object.keys(data).length > 0) {
                console.log("Loaded indoor data from database:", data);
                window.floorData = data;
            } else {
                // Fallback to local default file if DB is empty
                return fetch('data/indoor-data.json')
                    .then(res => res.ok ? res.json() : {})
                    .then(localData => {
                        window.floorData = localData || {};
                    });
            }
        })
        .catch(error => {
            console.log("No existing indoor data found or error loading:", error);
            if (!window.floorData) window.floorData = {};
        });
}
function loadFloorData(buildingName, floorIndex, roomNameToHighlight = null) {
    indoorLayers.clearLayers();
    if (!window.floorData) return;
    const bData = window.floorData[buildingName];
    if (bData && bData.floors) {
        const floorObj = bData.floors.find(f => f.id == floorIndex);
        
        if (indoorBorderLayer) {
            if (floorObj && floorObj.bounds) {
                indoorBorderLayer.setBounds(floorObj.bounds);
            } else {
                indoorBorderLayer.setBounds([[0,0], [1000,1000]]);
            }
        }

        if (floorObj && floorObj.geoJson) {
            let layerToHighlight = null;
            L.geoJSON(floorObj.geoJson, {
                pointToLayer: function (feature, latlng) {
                    if (feature.properties && feature.properties.markerType) {
                        return L.marker(latlng, {icon: getCustomMarkerIcon(feature.properties.markerType)});
                    }
                    return L.marker(latlng);
                }
            }).eachLayer(layer => {
                if (layer.feature && layer.feature.properties && layer.feature.properties.name) {
                    const rName = layer.feature.properties.name;
                    layer.bindTooltip(rName, {
                        permanent: true,
                        direction: layer.feature.properties.markerType ? "top" : "center",
                        className: layer.feature.properties.markerType ? "marker-tooltip" : "room-tooltip"
                    });
                    
                    if (roomNameToHighlight && rName.toLowerCase() === roomNameToHighlight.toLowerCase()) {
                        layerToHighlight = layer;
                        layer.setStyle({ color: 'red', weight: 3, fillColor: '#ffcccc', fillOpacity: 0.7 });
                    }
                }
                indoorLayers.addLayer(layer);
            });
            
            if (layerToHighlight && layerToHighlight.getBounds) {
                // Focusăm harta pe cameră
                indoorMap.fitBounds(layerToHighlight.getBounds(), { padding: [20, 20], maxZoom: 1 });
            }
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