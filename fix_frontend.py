import re

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    for p, r in replacements:
        content = re.sub(p, r, content)
        
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"No changes in {path}")

# Layout.tsx
update_file('frontend/src/components/Layout.tsx', [
    # BottomNav active background and text
    (r'bg-peach text-dark-text', 'bg-soft-peach text-dark-text'),
    # Floating + button
    (r'bg-peach border-border text-dark-text shadow-modal', 'bg-primary border-primary text-white shadow-modal'),
    (r'bg-peach', 'bg-primary'), # if isolated
])

# MicButton.tsx
update_file('frontend/src/components/MicButton.tsx', [
    (r'bg-background', 'bg-soft-sage'),
    (r'border-primary bg-primary', 'border-primary bg-primary text-white'), # Recording
    (r'text-dark-text', 'text-primary'), # Idle icon
])

# LogMealModal.tsx
update_file('frontend/src/components/LogMealModal.tsx', [
    # Primary action background: dark-text -> primary
    (r'bg-dark-text text-white', 'bg-primary text-white'),
])

# ChatWindow.tsx
update_file('frontend/src/components/ChatWindow.tsx', [
    # Bot bubbles: white -> card, dark-text text
    (r'bg-white text-dark-text', 'bg-card text-dark-text'),
    # User bubbles: dark-text -> primary
    (r'bg-dark-text text-white', 'bg-primary text-white'),
])

# NutrientRing.tsx
update_file('frontend/src/components/NutrientRing.tsx', [
    # Track stroke color
    (r'stroke="#E8DED4"', 'stroke="#E5DDD3"'), # old line hex
    (r'stroke="var\(--tw-colors-border\)"', 'stroke="#E5DDD3"'), # if it was css var
])
