
const DEFAULT_CAMPUS_LAT = 44.433215;
const DEFAULT_CAMPUS_LON = 26.056764;
const DEFAULT_ZOOM_LEVEL = 18; // Increased zoom since the area is smaller
const MAP_BOUNDS = [
    [44.432102, 26.054500], // South-West
    [44.434329, 26.059028]  // North-East
];
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
function isValidCoordinate(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' &&
           lat >= -90 && lat <= 90 &&
           lon >= -180 && lon <= 180 &&
           !isNaN(lat) && !isNaN(lon);
}
function createRoomDetailsHtml(room, compact = false) {
    const details = `
        <div class="${compact ? 'popup-content' : ''}">
            ${compact ? `<div class="popup-title">${escapeHtml(room.name)}</div>` : ''}
            <div class="${compact ? 'popup-info' : 'room-info'}">
                <span class="${compact ? 'popup-label' : 'room-info-label'}">Building:</span>
                ${compact ? '' : '<span class="room-info-value">'}${escapeHtml(room.building)}${compact ? '' : '</span>'}
            </div>
            <div class="${compact ? 'popup-info' : 'room-info'}">
                <span class="${compact ? 'popup-label' : 'room-info-label'}">Floor:</span>
                ${compact ? '' : '<span class="room-info-value">'}${escapeHtml(room.floor)}${compact ? '' : '</span>'}
            </div>
            <div class="${compact ? 'popup-info' : 'room-info'}">
                <span class="${compact ? 'popup-label' : 'room-info-label'}">Capacity:</span>
                ${compact ? '' : '<span class="room-info-value">'}${escapeHtml(String(room.capacity))} people${compact ? '' : '</span>'}
            </div>
            <div class="${compact ? 'popup-info' : 'room-info'}">
                <span class="${compact ? 'popup-label' : 'room-info-label'}">Type:</span>
                ${compact ? '' : '<span class="room-info-value">'}${escapeHtml(room.type)}${compact ? '' : '</span>'}
            </div>
            ${!compact && room.description ? `
            <div class="room-info">
                <span class="room-info-label">Description:</span>
                <span class="room-info-value">${escapeHtml(room.description)}</span>
            </div>
            ` : ''}
        </div>
    `;
    return details;
}
