# ETTIway

ETTIway is a web-based campus navigation platform that provides an interactive map, room visualization and location-based guidance to help users easily find classrooms and buildings within a university campus.

## Features

- **Interactive Campus Map**: Browse an interactive map of the campus using Leaflet.js and OpenStreetMap
- **Room Markers**: Visual markers for all campus rooms with detailed information
- **Room Details**: Click on markers to view comprehensive room information
- **Sidebar Navigation**: Easy-to-use sidebar with room list and search interface
- **Responsive Design**: Clean and modern UI that works across different screen sizes

## Project Structure

```
ETTIway/
├── app/
│   ├── index.html              # Main HTML file
│   ├── css/
│   │   └── style.css           # Application styles
│   ├── js/
│   │   ├── main.js             # Main application logic
│   │   └── map.js              # Map functionality
│   └── data/
│       └── campus.sample.json  # Sample room data
└── README.md                   # This file
```

## Setup Instructions

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, or Safari)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Live Server Extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) for VS Code

### Installation

1. Clone or download this repository
2. Open the project folder in Visual Studio Code
3. Install the Live Server extension if you haven't already

### Running the Application

1. Open `app/index.html` in Visual Studio Code
2. Right-click on the file and select **"Open with Live Server"**
3. The application will open in your default browser
4. Alternatively, you can use the "Go Live" button in the VS Code status bar

## Usage

### Viewing the Map

- The interactive map displays the campus with markers for each room
- Use your mouse to pan around the map
- Scroll or use the +/- buttons to zoom in and out

### Exploring Rooms

- Click on any marker on the map to view room details in a popup
- The sidebar will update with detailed information about the selected room
- Browse the complete room list in the sidebar

### Room List

- The sidebar shows all available rooms
- Click on any room in the list to:
  - Focus the map on that room's location
  - Display detailed information in the sidebar

### Search (UI Only)

- The search input is currently a UI placeholder
- Future versions will implement room search functionality

## Technologies Used

- **HTML5**: Structure and content
- **CSS3**: Styling and layout
- **JavaScript (ES6+)**: Application logic
- **Leaflet.js**: Interactive map library
- **OpenStreetMap**: Map tile provider

## File Descriptions

### HTML (app/index.html)

Main application structure including:
- Sidebar with title, search input, and room details
- Map container for the interactive map
- External library imports (Leaflet.js)

### CSS (app/css/style.css)

Comprehensive styling including:
- Responsive sidebar layout
- Clean color scheme with gradients
- Interactive hover effects
- Custom scrollbar styling
- Mobile-responsive design

### JavaScript (app/js/main.js)

Main application logic:
- Application initialization
- Data loading from JSON
- Room list population
- Search input setup (UI only)

### JavaScript (app/js/map.js)

Map functionality:
- Map initialization with Leaflet
- Marker creation and management
- Popup generation
- Room focus and detail display

### Data (app/data/campus.sample.json)

Sample campus data including:
- Campus information
- 10 sample rooms with complete details
- Room coordinates for map placement

## Customization

### Adding More Rooms

Edit `app/data/campus.sample.json` to add more rooms:

```json
{
  "id": "room011",
  "name": "Your Room Name",
  "building": "Building Name",
  "floor": "Floor Number",
  "capacity": 40,
  "type": "Room Type",
  "description": "Room description",
  "latitude": 45.7489,
  "longitude": 21.2087
}
```

### Changing Map Location

Edit the coordinates in `app/js/map.js`:

```javascript
campusMap = L.map('map').setView([latitude, longitude], zoomLevel);
```

### Modifying Styles

Edit `app/css/style.css` to customize:
- Color schemes
- Fonts
- Layout dimensions
- Responsive breakpoints

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- This is a front-end only application with no backend functionality
- The search feature is UI only and does not perform actual filtering
- All data is loaded from a static JSON file
- Map tiles are provided by OpenStreetMap (internet connection required)

## Future Enhancements

Potential features for future versions:
- Functional search with filtering
- Route planning between rooms
- Building information pages
- User location tracking
- Mobile app version
- Backend integration for dynamic data

## License

This project is created for educational purposes.

## Author

ETTI Campus Navigation Team
