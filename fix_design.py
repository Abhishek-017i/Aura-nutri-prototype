import re
with open('docs/DESIGN.md', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('dark-text-soft', 'muted')
c = c.replace('one-border', 'one-line')

# BottomNav
c = re.sub(r'Active tab: flat `peach` background.*', r'Active tab: flat `soft-peach` background (`rounded-data`), `dark-text` text.', c)

# Floating + button
c = re.sub(r'- `peach` fill, `dark-text` plus icon, 1px `border` border.', r'- `primary` fill, `white` plus icon, 1px `primary` border.', c)

# LogMealModal
c = re.sub(r'Primary action uses `dark-text` bg.', r'Primary action uses `primary` bg, `white` text.', c)

# MicButton
c = re.sub(r'- 64px circle, `dark-text` border 2px, `background` fill.', r'- 64px circle, `primary` border 2px, `soft-sage` fill, `primary` icon.', c)
c = re.sub(r'- Recording: solid `dark-text` fill, white waveform icon.', r'- Recording: solid `primary` fill, `white` waveform icon.', c)
c = re.sub(r'- Disabled/loading: skeleton pulse.', r'- Disabled/loading: `background` fill, skeleton pulse.', c)

# ChatWindow
c = re.sub(r'- WhatsApp-like but pastel: `background` bg, user right \(`dark-text` bubbles\), bot left \(`white` bubbles\).', r'- WhatsApp-like but pastel: `background` bg, user right (`primary` bubbles, `white` text), bot left (`card` bubbles, `dark-text` text).', c)

# NO rules
c = c.replace('- Backgrounds are `background`. Cards are `white` with 1px `border` border.', '- Backgrounds are `background`. Cards are `card` with 1px `border` border.\n- Primary actions use `primary`.')

with open('docs/DESIGN.md', 'w', encoding='utf-8') as f:
    f.write(c)
