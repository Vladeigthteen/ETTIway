# ETTIway 🧭🎓

A friendly, web-based campus navigation platform that helps students, staff, and visitors find classrooms, buildings and rooms quickly using an interactive map and room visualization.

---

## 🚀 Project overview
ETTIway provides an intuitive campus map with room visualizations and guided routing so users can locate classrooms, labs and administrative offices with minimal effort. Built as a student-friendly educational project, the codebase is organized and easy to extend for coursework or campus pilots.

Key goals:
- Improve on-campus wayfinding for new students and guests
- Provide a clean codebase for learning front-end mapping and UI techniques
- Be easy to run locally for demos and development

---

## ✨ Features
- 🗺️ Interactive campus map (pan, zoom, clickable buildings)
- 🏫 Room visualization with basic details (room number, capacity)
- 📍 Location-based guidance / routing hints (simple step-by-step)
- 🔎 Search tool to quickly find rooms or departments
- ♿ Accessibility-focused labels and alternative text
- 🧩 Modular front-end structure so components can be reused or extended

---

## 📁 Project structure
A high-level view of the repository (adjust to your repo if different):

- /public or / (static site)
  - index.html — main entry point
  - styles/ — CSS styles
  - scripts/ — JavaScript app logic
  - assets/ — icons, fonts, images
  - data/ — campus map data (JSON)
- /src (optional for frameworks)
  - components/ — UI components
  - pages/ — page-level views
- README.md — this file
- LICENSE — (add your license here)

Tip: Keep map data in a single JSON/GeoJSON file for easy updates.

---

## 🛠️ How to run locally (VS Code + Live Server)
Quick steps to preview the project in your browser using Visual Studio Code:

1. Clone the repo
   - git clone https://github.com/<your-username>/ETTIway.git
2. Open the project in VS Code
   - File → Open Folder... → select the project folder
3. Install the Live Server extension (if not installed)
   - Extensions → search "Live Server" by Ritwick Dey → Install
4. Start the server
   - Right-click `index.html` → "Open with Live Server"
   - or use the status bar "Go Live" button
5. View in your browser
   - The app typically opens at http://127.0.0.1:5500 or http://localhost:5500
6. Edit & hot-reload
   - Save files in VS Code and Live Server will auto-reload the page

Troubleshooting:
- If the map data does not load, check the browser console for CORS/404 errors and verify the data path (relative vs absolute).
- If using a framework (React/Vue), follow that framework’s dev instructions instead.

---

## 📸 Screenshots
(Replace placeholders with actual images under /screenshots)

- ![Map view](./screenshots/map-view.png) — Interactive campus map
- ![Room view](./screenshots/room-view.png) — Room detail card
- ![Routing](./screenshots/routing.png) — Simple guidance steps

---

## 🛣️ Roadmap
Planned improvements and ideas (feel free to contribute):
- Short term
  - Add search autocomplete and building filters
  - Improve mobile responsive layout
- Mid term
  - Add multi-floor indoor maps and elevator/stair routing
  - Integrate real-time events (classes, room availability)
- Future
  - Accessibility audit and WCAG compliance
  - Mobile app or PWA with offline map support

---

## 📜 License note
This repository is prepared as a university/educational project. Before publishing or redistributing, confirm and add the appropriate license. Suggested options:
- MIT License — permissive, commonly used for student projects
- A university-specific license or educational-use statement if required

Example line to add to LICENSE or top-level:
"© [Year] [Your University / Team]. This project is for educational use. Replace with the appropriate license."

---

## 🤝 Contributing & Contact
Contributions are welcome! If you're a classmate or collaborator:
- Open an issue for bugs or feature requests
- Fork → branch → submit a pull request
- Add your name and contribution to CONTRIBUTORS.md (optional)

If you want guidance on adapting ETTIway for a course or campus demo, open an issue or reach out via GitHub.

---

Made with ❤️ for campus navigation and learning.
