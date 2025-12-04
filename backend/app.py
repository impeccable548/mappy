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
    """Search for a location using Nominatim API"""
    global last_request_time
    
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    
    try:
        # Respect rate limiting (1 request per second)
        current_time = time.time()
        time_since_last = current_time - last_request_time
        if time_since_last < 1.0:
            time.sleep(1.0 - time_since_last)
        
        last_request_time = time.time()
        
        # Using Nominatim for geocoding
        url = 'https://nominatim.openstreetmap.org/search'
        params = {
            'q': query,
            'format': 'json',
            'limit': 5,  # Get more results
            'addressdetails': 1,
            'accept-language': 'en'
        }
        headers = {
            'User-Agent': 'Mappy-App/1.0 (Educational Project)'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        results = response.json()
        
        if results and len(results) > 0:
            # Return the best result
            location = results[0]
            return jsonify({
                'success': True,
                'location': {
                    'lat': float(location['lat']),
                    'lon': float(location['lon']),
                    'display_name': location['display_name']
                }
            })
        else:
            return jsonify({
                'success': False, 
                'error': 'Location not found. Try: "Paris, France" or "University of Lagos"'
            }), 404
            
    except requests.Timeout:
        return jsonify({
            'success': False, 
            'error': 'Search timed out. Please try again.'
        }), 504
    except Exception as e:
        print(f"Search error: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Search failed. Check your connection.'
        }), 500

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