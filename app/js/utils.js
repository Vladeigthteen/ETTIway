/**
 * utils.js - Utility functions for ETTIway
 * Shared helper functions used across the application
 */

// Default map configuration constants
const DEFAULT_CAMPUS_LAT = 45.7489;
const DEFAULT_CAMPUS_LON = 21.2087;
const DEFAULT_ZOOM_LEVEL = 16;

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if coordinates are valid
 */
function isValidCoordinate(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' &&
           lat >= -90 && lat <= 90 &&
           lon >= -180 && lon <= 180 &&
           !isNaN(lat) && !isNaN(lon);
}

/**
 * Create HTML for room details display
 * @param {Object} room - Room data object
 * @param {boolean} compact - If true, creates compact version for popup
 * @returns {string} HTML string for room details
 */
function createRoomDetailsHtml(room, compact = false) {
    const details = `
        <div class="${compact ? 'popup-content' : ''}">
            ${compact ? `<div class="popup-title">${escapeHtml(room.name)}</div>` : ''}
            <div class="${compact ? 'popup-info' : 'room-info'}">
                <span class="${compact ? 'popup-label' : 'room-info-label'}">${compact ? 'Building:' : 'Building:'}</span>
                ${compact ? '' : '<span class="room-info-value">'}${escapeHtml(room.building)}${compact ? '' : '</span>'}
            </div>
            <div class="${compact ? 'popup-info' : 'room-info'}">
                <span class="${compact ? 'popup-label' : 'room-info-label'}">${compact ? 'Floor:' : 'Floor:'}</span>
                ${compact ? '' : '<span class="room-info-value">'}${escapeHtml(room.floor)}${compact ? '' : '</span>'}
            </div>
            <div class="${compact ? 'popup-info' : 'room-info'}">
                <span class="${compact ? 'popup-label' : 'room-info-label'}">${compact ? 'Capacity:' : 'Capacity:'}</span>
                ${compact ? '' : '<span class="room-info-value">'}${escapeHtml(String(room.capacity))} people${compact ? '' : '</span>'}
            </div>
            <div class="${compact ? 'popup-info' : 'room-info'}">
                <span class="${compact ? 'popup-label' : 'room-info-label'}">${compact ? 'Type:' : 'Type:'}</span>
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
