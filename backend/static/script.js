// mappy/backend/static/script.js

// --- Configuration & Constants ---
const CONFIG = {
    NOMINATIM_URL: 'https://nominatim.openstreetmap.org/search?format=json&q=',
    DEFAULT_COORDS: [51.505, -0.09], // London
    DEFAULT_ZOOM: 13,
    INITIAL_ZOOM: 2,
    MAX_ZOOM: 19,
    SPEEDS: { // Estimated speeds in km/h for straight-line time estimate
        WALK: 5,
        BIKE: 15,
        DRIVE: 60,
    }
};

// --- Utility Functions (Utils) ---

/**
 * Debounces a function call. Useful for limiting API calls on fast user input.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Converts meters to kilometers with two decimal places.
 * @param {number} meters 
 * @returns {string} 
 */
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return (meters / 1000).toFixed(2) + ' km';
}

/**
 * Converts distance and speed into an estimated time.
 * @param {number} distanceMeters - distance in meters
 * @param {number} speedKmh - speed in km/h
 * @returns {string} 
 */
function formatTime(distanceMeters, speedKmh) {
    const distanceKm = distanceMeters / 1000;
    const timeHours = distanceKm / speedKmh;
    const totalMinutes = Math.round(timeHours * 60);

    if (totalMinutes < 1) {
        return ' < 1 min';
    } else if (totalMinutes < 60) {
        return `${totalMinutes} mins`;
    } else {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    }
}

// --- Map Application Class (Core Logic) ---

class MappyApp {
    constructor() {
        // Properties for Leaflet instances
        this.map = null;
        this.userMarker = null;
        this.destinationMarker = null;
        this.routePolyline = null;
        this.userLocation = null; // Stored as L.LatLng
        this.varStyles = {}; // To store CSS variables

        // DOM Elements
        this.$searchInput = document.getElementById('search-input');
        this.$infoPanel = document.getElementById('info-panel');
        this.$themeToggle = document.getElementById('theme-toggle');

        this.init();
    }

    /**
     * Initializes the application: CSS variables, map, location, and event listeners.
     */
    init() {
        this.loadCSSVariables();
        this.initTheme();
        this.initMap();
        this.getUserLocation();
        this.addEventListeners();
    }

    /**
     * Loads dynamic CSS variables for use in JS (e.g., polyline color).
     */
    loadCSSVariables() {
        const root = getComputedStyle(document.documentElement);
        this.varStyles = {
            primaryColor: root.getPropertyValue('--primary-color').trim(),
            primaryColorDark: root.getPropertyValue('--primary-dark').trim(),
        };
    }

    /**
     * Initializes the Leaflet map instance.
     */
    initMap() {
        this.map = L.map('map').setView(CONFIG.DEFAULT_COORDS, CONFIG.INITIAL_ZOOM); 

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: CONFIG.MAX_ZOOM,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
    }
    
    /**
     * Sets up event listeners for user interactions.
     */
    addEventListeners() {
        document.getElementById('search-button').addEventListener('click', () => this.searchLocation());
        this.$searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation();
            }
        });
        document.getElementById('clear-route-button').addEventListener('click', () => this.clearRoute());
        
        // Debounce search input for suggested future features (like autocomplete)
        this.$searchInput.addEventListener('input', debounce(() => {
            // Future: Implement an autocomplete feature here
        }, 300));

        this.$themeToggle.addEventListener('change', () => this.toggleTheme());
    }

    // --- Geolocation & Location Handlers ---

    /**
     * Requests and handles the user's geolocation.
     */
    getUserLocation() {
        if (!navigator.geolocation) {
            console.warn("Geolocation not supported by browser.");
            this.map.setView(CONFIG.DEFAULT_COORDS, CONFIG.DEFAULT_ZOOM);
            return;
        }

        const success = (position) => {
            const { latitude, longitude } = position.coords;
            this.userLocation = L.latLng(latitude, longitude);

            // Set the initial map view to the user's location
            this.map.setView(this.userLocation, CONFIG.DEFAULT_ZOOM);

            // Use a custom icon for better styling
            const userIcon = L.divIcon({
                className: 'user-marker-icon',
                html: '<i class="fas fa-dot-circle"></i>',
                iconSize: [20, 20]
            });

            this.userMarker = L.marker(this.userLocation, { icon: userIcon })
                                .addTo(this.map)
                                .bindPopup("<b>You are here!</b>").openPopup();

            console.log(`User location found: ${latitude}, ${longitude}`);
        };

        const error = (err) => {
            console.error("Error getting location:", err.message);
            this.map.setView(CONFIG.DEFAULT_COORDS, CONFIG.DEFAULT_ZOOM);
            if (err.code === err.PERMISSION_DENIED) {
                 alert("Geolocation failed. Please enable location services for a personalized experience.");
            }
        };

        navigator.geolocation.getCurrentPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    }

    /**
     * Searches for a location using the Nominatim API.
     */
    async searchLocation() {
        const query = this.$searchInput.value.trim();
        if (!query) return;

        this.clearRoute(false); // Clear previous route/marker, but don't reset input

        try {
            const response = await fetch(CONFIG.NOMINATIM_URL + encodeURIComponent(query));
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0]; 
                const destinationLatLon = L.latLng(parseFloat(result.lat), parseFloat(result.lon));

                // 1. Display the destination marker
                const destIcon = L.divIcon({
                    className: 'destination-marker-icon',
                    html: '<i class="fas fa-map-marker-alt"></i>',
                    iconSize: [20, 20]
                });
                
                this.destinationMarker = L.marker(destinationLatLon, { icon: destIcon })
                                          .addTo(this.map)
                                          .bindPopup(`<b>${result.display_name}</b>`).openPopup();

                // 2. Calculate and display the route details
                this.displayRouteAndDistance(destinationLatLon, result.display_name);

            } else {
                alert(`Could not find a location for "${query}". Please refine your search.`);
                this.$searchInput.focus();
            }
        } catch (error) {
            console.error('Error during search:', error);
            alert('An error occurred while searching. Check your network connection.');
        }
    }

    /**
     * Calculates and displays approximate distance and time (straight line).
     * @param {L.LatLng} destinationLatLon - The destination coordinates
     * @param {string} name - The name of the destination
     */
    displayRouteAndDistance(destinationLatLon, name) {
        if (this.userLocation) {
            // Use Haversine distance
            const distanceMeters = this.userLocation.distanceTo(destinationLatLon);

            // Fit map to show both markers
            const bounds = L.latLngBounds(this.userLocation, destinationLatLon);
            this.map.fitBounds(bounds, { padding: [50, 50] });

            // Display Route Line (straight line)
            const latlngs = [this.userLocation, destinationLatLon];
            this.routePolyline = L.polyline(latlngs, { 
                color: this.varStyles.primaryColor, 
                weight: 6, 
                opacity: 0.7, 
                dashArray: '10, 5' // Dashed line to indicate straight-line approximation
            }).addTo(this.map);

            // Update the UI
            document.getElementById('walk-distance').textContent = formatDistance(distanceMeters);
            document.getElementById('walk-time').textContent = formatTime(distanceMeters, CONFIG.SPEEDS.WALK);

            document.getElementById('drive-distance').textContent = formatDistance(distanceMeters);
            document.getElementById('drive-time').textContent = formatTime(distanceMeters, CONFIG.SPEEDS.DRIVE);

            document.getElementById('bike-distance').textContent = formatDistance(distanceMeters);
            document.getElementById('bike-time').textContent = formatTime(distanceMeters, CONFIG.SPEEDS.BIKE);

        } else {
            // If user location is unknown, just zoom to the destination
            this.map.setView(destinationLatLon, CONFIG.DEFAULT_ZOOM);
            document.getElementById('walk-distance').textContent = 'N/A';
            document.getElementById('walk-time').textContent = 'Requires User Location';
            // Other fields will also show N/A
        }

        this.$infoPanel.classList.remove('hidden');
        document.getElementById('destination-name').textContent = name;
    }

    /**
     * Clears the destination marker, route, and info panel.
     * @param {boolean} clearInput - If true, clears the search input value.
     */
    clearRoute(clearInput = true) {
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
            this.destinationMarker = null;
        }
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
        }

        this.$infoPanel.classList.add('hidden');
        if (clearInput) {
            this.$searchInput.value = '';
        }

        // Optionally zoom back to the user's location or default center
        if (this.userLocation) {
            this.map.setView(this.userLocation, CONFIG.DEFAULT_ZOOM);
        } else {
            this.map.setView(CONFIG.DEFAULT_COORDS, CONFIG.DEFAULT_ZOOM);
        }
    }

    // --- Theme Logic ---

    /**
     * Initializes the theme based on local storage or system preference.
     */
    initTheme() {
        const isDarkMode = localStorage.getItem('mappy-theme') === 'dark' || 
                           (localStorage.getItem('mappy-theme') === null && 
                            window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.$themeToggle.checked = true;
        }
    }

    /**
     * Toggles between light and dark theme and persists the choice.
     */
    toggleTheme() {
        const isDarkMode = this.$themeToggle.checked;
        const theme = isDarkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mappy-theme', theme);

        // Note: Map tile layer refresh might be needed for some custom layers, 
        // but the default OSM tiles usually handle the theme switch fine.
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check for required external libraries
    if (typeof L === 'undefined' || typeof L.map === 'undefined') {
        console.error("Leaflet not loaded. Check the <script> tags in index.html.");
        document.getElementById('map-container').innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Map Library Not Loaded</h1><p>Please check console for details.</p></div>';
        return;
    }
    
    // Start the application
    window.mappyApp = new MappyApp();
});
