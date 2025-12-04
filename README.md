🗺️ Mappy - Next-Gen Map Navigator
Mappy is an ultra-modern, feature-rich web mapping application that rivals Google Maps. Built with Flask, Leaflet.js, and OpenStreetMap, it offers real-time tracking, voice search, multiple map styles, and intelligent routing.
✨ Features
🎯 Core Navigation
Interactive Map: Powered by Leaflet.js with multiple tile providers
Real-time Geolocation: Auto-centers on your location with pulsing marker
Smart Search: Find ANY place worldwide using Nominatim API
Multi-Modal Routing: Compare Drive 🚗 / Walk 🚶 / Cycle 🚴 / Fly ✈️ times instantly
🚀 Advanced Features
Live Tracking 📡: Real-time position updates as you move
Voice Search 🎤: Speak your destination hands-free
Built-in Compass 🧭: Real compass with device orientation
3 Map Styles: Dark Mode, Street View, Satellite imagery
Share Location 🔗: One-click sharing via link or native apps
GPS Stats Bar: Live accuracy, altitude, and location display
Accuracy Circle: Visual GPS precision indicator
🎨 Premium UI/UX
Gold & Black luxury theme
Glassmorphism effects
Smooth animations throughout
Responsive mobile-first design
No ads, no tracking
🛠️ Local Setup
Prerequisites
Python 3.8+
pip
1. Clone the Repository
git clone https://github.com/YourUsername/mappy.git
cd mappy
2. Install Dependencies
pip install -r backend/requirements.txt
3. Run Locally
cd backend
python app.py
Visit: http://localhost:5000
🚀 Deploy to Render
Quick Deploy:
Push to GitHub
Connect Render to your repo
Configure:
Build Command: pip install -r backend/requirements.txt
Start Command: gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT
Deploy! 🎉
📂 Project Structure
mappy/
├── .gitignore
├── backend/
│   ├── app.py              # Flask server
│   ├── requirements.txt    # Python dependencies
│   ├── templates/
│   │   └── index.html     # Main HTML
│   └── static/
│       ├── script.js      # JavaScript logic
│       └── style.css      # Styling
🎯 API Endpoints
POST /api/search
Search for locations using Nominatim.
Request:
{
  "query": "Eiffel Tower"
}
Response:
{
  "success": true,
  "location": {
    "lat": 48.858844,
    "lon": 2.294351,
    "display_name": "Eiffel Tower, Paris, France"
  }
}
POST /api/route
Calculate routes using OSRM.
Request:
{
  "start": {"lat": 48.8566, "lon": 2.3522},
  "end": {"lat": 48.8584, "lon": 2.2945},
  "profile": "driving"
}
Response:
{
  "success": true,
  "route": {
    "distance": 5420,
    "duration": 780,
    "geometry": [...]
  }
}
🌟 Technologies Used
Backend: Flask (Python)
Frontend: HTML5, CSS3, JavaScript (ES6+)
Mapping: Leaflet.js
Geocoding: Nominatim (OpenStreetMap)
Routing: OSRM (Open Source Routing Machine)
Tiles: CartoDB, OSM, Esri
📱 Browser Support
✅ Chrome/Edge (90+)
✅ Firefox (88+)
✅ Safari (14+)
✅ Mobile browsers (iOS Safari, Chrome Mobile)
Features requiring device support:
Voice Search: Requires Web Speech API
Compass: Requires device orientation sensors
Live Tracking: Requires Geolocation API
🎨 Screenshots
(Add screenshots here of your app in action!)
🤝 Contributing
Fork the repo
Create your feature branch (git checkout -b feature/AmazingFeature)
Commit changes (git commit -m 'Add AmazingFeature')
Push to branch (git push origin feature/AmazingFeature)
Open a Pull Request
📄 License
This project is licensed under the MIT License.
🙏 Acknowledgments
OpenStreetMap contributors
Leaflet.js community
Nominatim & OSRM projects
📧 Contact
Your Name - @igheleraro2@gmail.com
Project Link: https://github.com/impeccable548/mappy
🎯 Made with ❤️ and lots of ☕