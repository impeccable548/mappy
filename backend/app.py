from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search', methods=['POST'])
def search_location():
    """Search for a location using Nominatim API"""
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    
    try:
        # Using Nominatim for geocoding
        url = 'https://nominatim.openstreetmap.org/search'
        params = {
            'q': query,
            'format': 'json',
            'limit': 1,
            'addressdetails': 1
        }
        headers = {
            'User-Agent': 'Mappy-App/1.0'
        }
        
        response = requests.get(url, params=params, headers=headers)
        results = response.json()
        
        if results:
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
            return jsonify({'success': False, 'error': 'Location not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

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
            'geometries': 'geojson'
        }
        
        response = requests.get(url, params=params)
        route_data = response.json()
        
        if route_data['code'] == 'Ok':
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
            return jsonify({'success': False, 'error': 'Route not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)