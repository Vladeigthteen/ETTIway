# 🗺️ ETTIway

**ETTIway** este o aplicație web interactivă pentru navigarea în campus-ul universitar. Proiectul oferă o hartă interactivă a clădirilor, cu funcționalitate de căutare și afișare a detaliilor despre fiecare clădire.

## 📋 Despre Proiect

ETTIway este un sistem de navigare campus care permite utilizatorilor să:
- Vizualizeze o hartă interactivă a campus-ului
- Exploreze clădirile și locațiile din campus
- Caute clădiri specifice
- Vizualizeze detalii despre fiecare clădire
- Acceseze planuri interioare (floor plans)
- Încărce și vizualizeze date din OpenStreetMap (OSM)

## 🚀 Funcționalități

### Implementate
- ✅ Repository GitHub creat
- ✅ Hartă interactivă bazată pe Leaflet.js
- ✅ Interfață sidebar cu detalii despre clădiri
- ✅ Sistem de afișare a planurilor interioare (indoor maps)
- ✅ Integrare cu date OpenStreetMap
- ✅ Interfață responsive

### În Dezvoltare
- 🔄 Funcționalitate de căutare
- 🔄 Localizare utilizator
- 🔄 Rutare între locații
- 🔄 Sistem de markere pe hartă

## 🛠️ Tehnologii Utilizate

- **Frontend:**
  - HTML5
  - CSS3
  - JavaScript (Vanilla)
  - [Leaflet.js](https://leafletjs.com/) - Librărie pentru hărți interactive

- **Date:**
  - JSON pentru stocarea datelor despre campus
  - OpenStreetMap (OSM) pentru date geografice

## 📁 Structura Proiectului

```
ETTIway/
├── app/
│   ├── index.html          # Pagina principală
│   ├── css/
│   │   └── style.css       # Stiluri CSS personalizate
│   └── js/
│       └── app.js          # Logica aplicației
├── Tasks.md                # Lista de taskuri
└── README.md               # Documentație proiect
```

## 🎯 Instalare și Utilizare

### Cerințe
- Browser web modern (Chrome, Firefox, Safari, Edge)
- Server web local (opțional, pentru dezvoltare)

### Pași de instalare

1. **Clonează repository-ul:**
```bash
git clone https://github.com/Vladeigthteen/ETTIway.git
cd ETTIway
```

2. **Deschide aplicația:**
   - Deschide fișierul `app/index.html` direct în browser, SAU
   - Folosește un server local (recomandat):
   
   ```bash
   # Cu Python 3
   python -m http.server 8000
   
   # Cu Node.js (http-server)
   npx http-server app/
   ```

3. **Accesează aplicația:**
   - Deschide browser-ul la `http://localhost:8000` (sau portul corespunzător)

## 📖 Utilizare

### Interfață Utilizator

1. **Sidebar (Panoul lateral):**
   - **Search**: Caută clădiri din campus (în dezvoltare)
   - **Building Details**: Afișează detalii despre clădirea selectată
   - **Available Buildings**: Lista tuturor clădirilor disponibile
   - **OSM Data**: Controale pentru încărcarea și afișarea datelor OSM

2. **Hartă Interactivă:**
   - Click pe markere pentru a vedea detalii despre clădiri
   - Zoom in/out folosind controalele hărții
   - Drag pentru a naviga pe hartă

3. **Planuri Interioare:**
   - Click pe o clădire pentru a deschide planul interior
   - Navigare între etaje folosind butoanele din modal
   - Închidere modal cu butonul X

### Încărcare Date OSM

1. Click pe butonul "Încarcă drumuri OSM"
2. Bifează checkbox-ul "Afișează drumuri OSM" pentru a vizualiza drumurile

## 🗂️ Fișier de Date

Proiectul folosește un fișier JSON pentru datele campus-ului. Structura recomandată:

```json
{
  "buildings": [
    {
      "id": "building-1",
      "name": "Nume Clădire",
      "coordinates": [lat, lng],
      "description": "Descriere clădire",
      "floors": [
        {
          "level": 0,
          "name": "Parter",
          "map": "url-to-floor-plan.png"
        }
      ]
    }
  ]
}
```

## 🔧 Dezvoltare

### Taskuri Planificate

Consultă fișierul [Tasks.md](Tasks.md) pentru lista completă de taskuri:

**Backlog:**
- Inițializare structură proiect
- Creare fișier README.md
- Adăugare hartă interactivă a campusului
- Creare fișier campus.sample.json
- Afișare markere pe hartă
- Creare layout sidebar
- Câmp de căutare (UI)
- Afișare detalii sală
- Localizare utilizator
- Rutare de bază

## 🤝 Contribuții

Contribuțiile sunt binevenite! Pentru a contribui:

1. Fork repository-ul
2. Creează un branch pentru feature-ul tău (`git checkout -b feature/NumeFeature`)
3. Commit modificările (`git commit -m 'Adaugă NumeFeature'`)
4. Push pe branch (`git push origin feature/NumeFeature`)
5. Deschide un Pull Request

## 📝 Licență

Acest proiect este dezvoltat în scop educațional.

## 👤 Autor

**Vladeigthteen**
- GitHub: [@Vladeigthteen](https://github.com/Vladeigthteen)

## 📞 Contact & Suport

Pentru întrebări sau probleme, deschide un [issue](https://github.com/Vladeigthteen/ETTIway/issues) pe GitHub.

---

**ETTIway** - Navighează campus-ul cu ușurință! 🎓🗺️
