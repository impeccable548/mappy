from flask import Flask, render_template, jsonify, request
import requests
import time

app = Flask(__name__)

# Cache to avoid rate limiting
last_request_time = 0

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search', methods=['POST'])
def search_location():
    """Search for a location using multiple geocoding services"""
    global last_request_time
    
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    
    # Respect rate limiting (1 request per second)
    current_time = time.time()
    time_since_last = current_time - last_request_time
    if time_since_last < 1.0:
        time.sleep(1.0 - time_since_last)
    
    last_request_time = time.time()
    
    # Try multiple geocoding services
    result = try_nominatim(query)
    if result:
        return jsonify(result)
    
    result = try_photon(query)
    if result:
        return jsonify(result)
    
    result = try_locationiq(query)
    if result:
        return jsonify(result)
    
    # If all fail, return error
    return jsonify({
        'success': False, 
        'error': 'Location not found. Try being more specific (e.g., "Lagos, Nigeria")'
    }), 404

def try_nominatim(query):
    """Try Nominatim geocoding"""
    try:
        url = 'https://nominatim.openstreetmap.org/search'
        params = {
            'q': query,
            'format': 'json',
            'limit': 5,
            'addressdetails': 1,
            'accept-language': 'en'
        }
        headers = {
            'User-Agent': 'Mappy-App/1.0 (Educational Project)'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=5)
        results = response.json()
        
        if results and len(results) > 0:
            location = results[0]
            return {
                'success': True,
                'location': {
                    'lat': float(location['lat']),
                    'lon': float(location['lon']),
                    'display_name': location['display_name']
                }
            }
    except Exception as e:
        print(f"Nominatim error: {str(e)}")
    return None

def try_photon(query):
    """Try Photon geocoding (alternative OSM-based service)"""
    try:
        url = 'https://photon.komoot.io/api/'
        params = {
            'q': query,
            'limit': 5,
            'lang': 'en'
        }
        
        response = requests.get(url, params=params, timeout=5)
        data = response.json()
        
        if data.get('features') and len(data['features']) > 0:
            feature = data['features'][0]
            coords = feature['geometry']['coordinates']
            properties = feature.get('properties', {})
            
            # Build display name
            name_parts = []
            for key in ['name', 'city', 'state', 'country']:
                if properties.get(key):
                    name_parts.append(properties[key])
            display_name = ', '.join(name_parts) if name_parts else query
            
            return {
                'success': True,
                'location': {
                    'lat': float(coords[1]),
                    'lon': float(coords[0]),
                    'display_name': display_name
                }
            }
    except Exception as e:
        print(f"Photon error: {str(e)}")
    return None

def try_locationiq(query):
    """Try LocationIQ (no API key needed for basic search)"""
    try:
        url = 'https://us1.locationiq.com/v1/search'
        params = {
            'q': query,
            'format': 'json',
            'limit': 5,
            'key': 'pk.0f147952a41c555a5b70614039fd148b'  # Free public key
        }
        
        response = requests.get(url, params=params, timeout=5)
        results = response.json()
        
        if results and len(results) > 0 and not isinstance(results, dict):
            location = results[0]
            return {
                'success': True,
                'location': {
                    'lat': float(location['lat']),
                    'lon': float(location['lon']),
                    'display_name': location['display_name']
                }
            }
    except Exception as e:
        print(f"LocationIQ error: {str(e)}")
    return None

@app.route('/api/route', methods=['POST'])
def get_route():
    """Get route between two points using OSRM"""
    data = request.json
    start = data.get('start')  # {lat, lon}
    end = data.get('end')  # {lat, lon}
    profile = data.get('profile', 'driving')  # driving, walking, cycling
    
    if not start or not end:
        return jsonify({'error': 'Start and end coordinates required'}), 400
    
    try:
        # Map profile to OSRM profile
        profile_map = {
            'driving': 'car',
            'walking': 'foot',
            'cycling': 'bike',
            'riding': 'bike'
        }
        osrm_profile = profile_map.get(profile, 'car')
        
        # OSRM API endpoint
        url = f'https://router.project-osrm.org/route/v1/{osrm_profile}/{start["lon"]},{start["lat"]};{end["lon"]},{end["lat"]}'
        params = {
            'overview': 'full',
            'geometries': 'geojson',
            'steps': 'true'
        }
        
        response = requests.get(url, params=params, timeout=10)
        route_data = response.json()
        
        if route_data.get('code') == 'Ok' and route_data.get('routes'):
            route = route_data['routes'][0]
            return jsonify({
                'success': True,
                'route': {
                    'distance': route['distance'],  # meters
                    'duration': route['duration'],  # seconds
                    'geometry': route['geometry']['coordinates']
                }
            })
        else:
            return jsonify({
                'success': False, 
                'error': 'Route not found'
            }), 404
            
    except requests.Timeout:
        return jsonify({
            'success': False, 
            'error': 'Route calculation timed out'
        }), 504
    except Exception as e:
        print(f"Route error: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Route calculation failed'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)