// Global variables
let map;
let userMarker;
let searchMarker;
let routeLine;
let userLocation = null;
let destinationLocation = null;
let currentTravelMode = 'driving';
let watchId = null;
let isTracking = false;
let accuracyCircle = null;
let currentLayer = 'dark';
let allRouteData = {};

// Map tile layers
const tileLayers = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri'
    }
};

let activeLayer = null;

// Initialize map
function initMap() {
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView([20, 0], 2);

    // Add default layer
    activeLayer = L.tileLayer(tileLayers.dark.url, {
        attribution: tileLayers.dark.attribution,
        maxZoom: 20
    }).addTo(map);

    // Custom pulsing marker icon for user location
    const pulsingIcon = L.divIcon({
        className: 'pulsing-marker-icon',
        html: '<div class="pulsing-marker"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    window.pulsingIcon = pulsingIcon;

    // Custom gold marker for destinations
    const goldIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: linear-gradient(135deg, #FFD700, #DAA520); width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid #0a0a0a; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5);"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });

    window.goldIcon = goldIcon;
}

// Request user location with high accuracy
function requestLocation() {
    if ('geolocation' in navigator) {
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            position => {
                updateUserLocation(position);
                document.getElementById('location-prompt').classList.add('hidden');
                showNotification('🎯 Location enabled! You\'re on the map!');
            },
            error => {
                console.error('Location error:', error);
                let errorMsg = 'Could not get your location.';
                if (error.code === 1) errorMsg = 'Location permission denied.';
                else if (error.code === 2) errorMsg = 'Location unavailable.';
                else if (error.code === 3) errorMsg = 'Location request timed out.';
                
                showNotification(errorMsg, 'error');
                document.getElementById('location-prompt').classList.add('hidden');
            },
            options
        );
    } else {
        showNotification('Geolocation is not supported by your browser.', 'error');
        document.getElementById('location-prompt').classList.add('hidden');
    }
}

// Update user location on map
function updateUserLocation(position) {
    userLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading
    };
    
    // Update or add user marker with pulsing effect
    if (userMarker) {
        userMarker.setLatLng([userLocation.lat, userLocation.lon]);
    } else {
        userMarker = L.marker([userLocation.lat, userLocation.lon], {
            icon: window.pulsingIcon
        }).addTo(map);
        
        userMarker.bindPopup('<b style="color: #FFD700;">📍 You are here!</b>').openPopup();
        map.setView([userLocation.lat, userLocation.lon], 13);
    }
    
    // Update or add accuracy circle
    if (accuracyCircle) {
        accuracyCircle.setLatLng([userLocation.lat, userLocation.lon]);
        accuracyCircle.setRadius(userLocation.accuracy);
    } else {
        accuracyCircle = L.circle([userLocation.lat, userLocation.lon], {
            radius: userLocation.accuracy,
            color: '#FFD700',
            fillColor: '#FFD700',
            fillOpacity: 0.1,
            weight: 2
        }).addTo(map);
    }
    
    // Update stats bar
    updateStatsBar();
    
    // Recalculate all routes if destination exists
    if (destinationLocation) {
        calculateAllRoutes();
    }
}

// Update stats bar
function updateStatsBar() {
    if (userLocation) {
        // Get location name
        reverseGeocode(userLocation.lat, userLocation.lon);
        
        // Update accuracy
        document.getElementById('gps-accuracy').textContent = 
            `${Math.round(userLocation.accuracy)}m accuracy`;
        
        // Update altitude
        if (userLocation.altitude) {
            document.getElementById('altitude').textContent = 
                `${Math.round(userLocation.altitude)}m alt`;
        }
    }
}

// Reverse geocode to get location name
async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mappy-App/1.0' }
        });
        const data = await response.json();
        
        if (data.address) {
            const location = data.address.city || data.address.town || 
                           data.address.village || data.address.county || 'Unknown';
            document.getElementById('current-location').textContent = location;
        }
    } catch (error) {
        console.error('Reverse geocode error:', error);
    }
}

// Toggle live tracking
function toggleTracking() {
    const trackingBtn = document.getElementById('tracking-btn');
    
    if (isTracking) {
        // Stop tracking
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        isTracking = false;
        trackingBtn.classList.remove('active');
        showNotification('Live tracking disabled');
    } else {
        // Start tracking
        if ('geolocation' in navigator) {
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            
            watchId = navigator.geolocation.watchPosition(
                position => updateUserLocation(position),
                error => console.error('Tracking error:', error),
                options
            );
            
            isTracking = true;
            trackingBtn.classList.add('active');
            showNotification('🔴 Live tracking enabled!');
        }
    }
}

// Recenter map on user location
function recenterMap() {
    if (userLocation) {
        map.setView([userLocation.lat, userLocation.lon], 15, {
            animate: true,
            duration: 1
        });
        showNotification('📍 Centered on your location');
    } else {
        showNotification('Location not available', 'error');
    }
}

// Search for location
async function searchLocation(query) {
    if (!query.trim()) {
        showNotification('Please enter a location to search.', 'error');
        return;
    }

    showNotification('🔍 Searching...');

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (data.success) {
            destinationLocation = data.location;
            
            // Remove previous search marker
            if (searchMarker) {
                map.removeLayer(searchMarker);
            }
            
            // Add new search marker
            searchMarker = L.marker([destinationLocation.lat, destinationLocation.lon], {
                icon: window.goldIcon
            }).addTo(map);
            
            searchMarker.bindPopup(`<b style="color: #FFD700;">📍 ${destinationLocation.display_name}</b>`).openPopup();
            
            // Fit bounds to show both markers
            if (userLocation) {
                const bounds = L.latLngBounds(
                    [userLocation.lat, userLocation.lon],
                    [destinationLocation.lat, destinationLocation.lon]
                );
                map.fitBounds(bounds, { padding: [100, 100] });
                
                // Calculate routes for all modes
                calculateAllRoutes();
            } else {
                map.setView([destinationLocation.lat, destinationLocation.lon], 13);
            }
            
            // Show info panel
            updateInfoPanel(destinationLocation);
            showNotification('✅ Location found!');
            
        } else {
            showNotification('Location not found. Try being more specific.', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
    }
}

// Calculate routes for all travel modes
async function calculateAllRoutes() {
    if (!userLocation || !destinationLocation) return;

    const modes = ['driving', 'walking', 'cycling'];
    
    for (const mode of modes) {
        try {
            const response = await fetch('/api/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start: userLocation,
                    end: { lat: destinationLocation.lat, lon: destinationLocation.lon },
                    profile: mode
                })
            });

            const data = await response.json();

            if (data.success) {
                allRouteData[mode] = data.route;
                updateModeButton(mode, data.route);
            }
        } catch (error) {
            console.error(`Route error for ${mode}:`, error);
        }
    }
    
    // Calculate flying route
    const distance = calculateDistance(
        userLocation.lat, userLocation.lon,
        destinationLocation.lat, destinationLocation.lon
    );
    const flightTimeHours = distance / 800;
    
    allRouteData['flying'] = {
        distance: distance * 1000,
        duration: flightTimeHours * 3600,
        isStraightLine: true
    };
    
    updateModeButton('flying', allRouteData['flying']);
    
    // Display current mode route
    displayRoute(currentTravelMode);
}
// Update mode button with time
function updateModeButton(mode, routeData) {
    const timeElement = document.getElementById(`${mode === 'driving' ? 'drive' : mode === 'walking' ? 'walk' : mode === 'cycling' ? 'cycle' : 'fly'}-time`);
    if (timeElement) {
        timeElement.textContent = formatDuration(routeData.duration);
    }
}

// Display route for specific mode
function displayRoute(mode) {
    if (!allRouteData[mode]) return;
    
    // Remove previous route
    if (routeLine) {
        map.removeLayer(routeLine);
    }
    
    const route = allRouteData[mode];
    
    if (route.geometry) {
        // Draw road route
        const coordinates = route.geometry.map(coord => [coord[1], coord[0]]);
        routeLine = L.polyline(coordinates, {
            color: '#FFD700',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10',
            lineJoin: 'round'
        }).addTo(map);
    } else {
        // Draw straight line for flying
        routeLine = L.polyline([
            [userLocation.lat, userLocation.lon],
            [destinationLocation.lat, destinationLocation.lon]
        ], {
            color: '#FFD700',
            weight: 3,
            opacity: 0.7,
            dashArray: '15, 15',
            lineJoin: 'round'
        }).addTo(map);
    }
    
    // Animate route
    animateRoute(routeLine);
    
    // Update info panel
    updateInfoPanelWithRoute(route);
}

// Animate route line
function animateRoute(polyline) {
    let offset = 0;
    const animate = () => {
        offset += 1;
        polyline.setStyle({ dashOffset: -offset });
        if (offset < 100) requestAnimationFrame(animate);
    };
    animate();
}

// Calculate straight-line distance (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Update info panel
function updateInfoPanel(location) {
    const infoPanel = document.getElementById('info-panel');
    const infoContent = document.getElementById('info-content');
    
    infoContent.innerHTML = `
        <div class="info-item">
            <div class="info-label">📍 Location</div>
            <div class="info-value">${location.display_name}</div>
        </div>
        <div class="info-item">
            <div class="info-label">🌐 Coordinates</div>
            <div class="info-value">${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}</div>
        </div>
    `;
    
    infoPanel.classList.add('active');
}

// Update info panel with route details
function updateInfoPanelWithRoute(route) {
    const infoContent = document.getElementById('info-content');
    const distance = (route.distance / 1000).toFixed(2);
    const duration = formatDuration(route.duration);
    
    const modeEmojis = {
        driving: '🚗',
        walking: '🚶',
        cycling: '🚴',
        flying: '✈️'
    };
    
    const existingInfo = infoContent.innerHTML;
    
    infoContent.innerHTML = existingInfo + `
        <div class="info-item">
            <div class="info-label">${modeEmojis[currentTravelMode]} Distance</div>
            <div class="info-value">${distance} km</div>
        </div>
        <div class="info-item">
            <div class="info-label">⏱️ ${route.isStraightLine ? 'Estimated ' : ''}Time</div>
            <div class="info-value">${duration}</div>
        </div>
    `;
}

// Format duration
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Change map layer
function changeLayer(layerType) {
    if (activeLayer) {
        map.removeLayer(activeLayer);
    }
    
    activeLayer = L.tileLayer(tileLayers[layerType].url, {
        attribution: tileLayers[layerType].attribution,
        maxZoom: 20
    }).addTo(map);
    
    currentLayer = layerType;
    showNotification(`Map style changed to ${layerType}`);
}

// Toggle compass
function toggleCompass() {
    const compassOverlay = document.getElementById('compass-overlay');
    const compassBtn = document.getElementById('compass-btn');
    
    if (compassOverlay.classList.contains('active')) {
        compassOverlay.classList.remove('active');
        compassBtn.classList.remove('active');
        if (window.DeviceOrientationEvent) {
            window.removeEventListener('deviceorientation', handleOrientation);
        }
    } else {
        if (window.DeviceOrientationEvent) {
            compassOverlay.classList.add('active');
            compassBtn.classList.add('active');
            window.addEventListener('deviceorientation', handleOrientation);
            showNotification('🧭 Compass activated');
        } else {
            showNotification('Compass not supported on this device', 'error');
        }
    }
}

// Handle device orientation for compass
function handleOrientation(event) {
    const heading = event.alpha; // 0-360 degrees
    const needle = document.getElementById('compass-needle');
    const bearing = document.getElementById('compass-bearing');
    
    if (heading !== null) {
        needle.style.transform = `translate(-50%, -100%) rotate(${-heading}deg)`;
        bearing.textContent = `${Math.round(heading)}°`;
    }
}

// Share location
function shareLocation() {
    if (userLocation) {
        const url = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lon}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Location - Mappy',
                text: 'Check out my location!',
                url: url
            }).then(() => {
                showNotification('📤 Location shared!');
            }).catch(err => {
                copyToClipboard(url);
            });
        } else {
            copyToClipboard(url);
        }
    } else {
        showNotification('Location not available', 'error');
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('📋 Location link copied!');
    }).catch(err => {
        showNotification('Could not copy link', 'error');
    });
}

// Voice search
let recognition;
function toggleVoiceSearch() {
    const voiceBtn = document.getElementById('voice-search-btn');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('Voice search not supported', 'error');
        return;
    }
    
    if (!recognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            voiceBtn.classList.add('listening');
            showNotification('🎤 Listening...');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('search-input').value = transcript;
            searchLocation(transcript);
        };
        
        recognition.onend = () => {
            voiceBtn.classList.remove('listening');
        };
        
        recognition.onerror = (event) => {
            voiceBtn.classList.remove('listening');
            showNotification('Voice search error', 'error');
        };
    }
    
    recognition.start();
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#ff4444' : 'linear-gradient(135deg, #FFD700, #DAA520)'};
        color: ${type === 'error' ? '#fff' : '#0a0a0a'};
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5);
        z-index: 10001;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    // Location buttons
    document.getElementById('enable-location').addEventListener('click', requestLocation);
    document.getElementById('skip-location').addEventListener('click', () => {
        document.getElementById('location-prompt').classList.add('hidden');
    });
    
    // Search
    document.getElementById('search-btn').addEventListener('click', () => {
        searchLocation(document.getElementById('search-input').value);
    });
    
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation(e.target.value);
    });
    
    // Voice search
    document.getElementById('voice-search-btn').addEventListener('click', toggleVoiceSearch);
    
    // Floating controls
    document.getElementById('recenter-btn').addEventListener('click', recenterMap);
    document.getElementById('tracking-btn').addEventListener('click', toggleTracking);
    document.getElementById('compass-btn').addEventListener('click', toggleCompass);
    
    document.getElementById('layers-btn').addEventListener('click', () => {
        document.getElementById('layer-panel').classList.toggle('active');
    });
    
    // Layer selection
    document.querySelectorAll('.layer-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.layer-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            changeLayer(btn.dataset.layer);
            document.getElementById('layer-panel').classList.remove('active');
        });
    });
    
    document.getElementById('close-layers').addEventListener('click', () => {
        document.getElementById('layer-panel').classList.remove('active');
    });
    
    // Share location
    document.getElementById('share-location-btn').addEventListener('click', shareLocation);
    
    // Info panel
    document.getElementById('close-info').addEventListener('click', () => {
        document.getElementById('info-panel').classList.remove('active');
    });
    
    // Travel modes
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTravelMode = btn.dataset.mode;
            
            if (userLocation && destinationLocation) {
                displayRoute(currentTravelMode);
            }
        });
    });
});