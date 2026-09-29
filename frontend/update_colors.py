import os
import re

replacements = [
  (r'\btext-charcoal-soft\b', 'text-muted'),
  (r'\bbg-charcoal-soft\b', 'bg-muted'),
  (r'\bborder-charcoal-soft\b', 'border-muted'),
  (r'\bplaceholder:text-charcoal-soft\b', 'placeholder:text-muted'),
  
  (r'\btext-charcoal\b', 'text-dark-text'),
  (r'\bbg-charcoal\b', 'bg-primary'),
  (r'\bborder-charcoal\b', 'border-primary'),
  (r'\boutline-charcoal\b', 'outline-dark-text'),
  (r'\bplaceholder:text-charcoal\b', 'placeholder:text-dark-text'),
  
  (r'\bbg-lavender\b', 'bg-background'),
  (r'\btext-lavender\b', 'text-background'),
  (r'\bborder-lavender\b', 'border-background'),
  
  (r'\bbg-pink\b', 'bg-peach'),
  (r'\btext-pink\b', 'text-peach'),
  (r'\bborder-pink\b', 'border-peach'),
  
  (r'\bbg-line\b', 'bg-border'),
  (r'\btext-line\b', 'text-border'),
  (r'\bborder-line\b', 'border-border'),
  
  (r'\blavender\b', 'background'),
  (r'\bpink\b', 'peach'),
  (r'\bcharcoal\b', 'dark-text'),
  (r'\bline\b', 'border'),
]

count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.js', '.ts', '.jsx', '.tsx', '.css')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            orig = content
            for pattern, repl in replacements:
                content = re.sub(pattern, repl, content)
                
            if content != orig:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1
                print(f'Updated {path}')

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()
orig = content
for pattern, repl in replacements:
    content = re.sub(pattern, repl, content)
if content != orig:
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    count += 1
    print('Updated index.html')

print(f'Updated {count} files')
