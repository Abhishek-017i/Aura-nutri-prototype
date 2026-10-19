from scripts.get_test_token import get_demo_id_token
import requests

token = get_demo_id_token('krisha@auranutri.demo')
r = requests.post('http://localhost:8000/api/parse-meal',
    headers={'Authorization': f'Bearer {token}'},
    json={'text': '1 poori'})

print('Status:', r.status_code)
for item in r.json().get('items', []):
    print(f"Food: {item.get('food_name')}")
    print(f"Energy: {item.get('energy_kcal')} (should be <= 550)")
    print(f"Vit D: {item.get('vit_d_iu')} (should be <= 5.0)")
    print(f"Quality: {item.get('data_quality')} (should be estimated)")