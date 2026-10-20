from scripts.get_test_token import get_demo_id_token
import requests

token = get_demo_id_token('krisha@auranutri.demo')
headers = {'Authorization': f'Bearer {token}'}

# Parse
r1 = requests.post('http://localhost:8000/api/parse-meal', headers=headers,
    json={'text': '1 poori aur 1 katori dal'})
print('PARSE:', r1.status_code)

items = r1.json().get('items', [])

# Log Meal
r2 = requests.post('http://localhost:8000/api/log-meal', headers=headers,
    json={'items': items, 'meal_type': 'voice'})
print('LOG:', r2.status_code)

# Dashboard
r3 = requests.get('http://localhost:8000/api/dashboard', headers=headers)
print('DASHBOARD:', r3.status_code)