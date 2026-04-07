import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

icons = {
    'reason-1': '<svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gw1" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="#c2185b"/><stop offset="1" stop-color="#9c27b0"/></linearGradient></defs><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="url(#gw1)" stroke-width="1.8" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" stroke="url(#gw1)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'reason-2': '<svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gw2" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="#c2185b"/><stop offset="1" stop-color="#9c27b0"/></linearGradient></defs><path d="M12 20h9" stroke="url(#gw2)" stroke-width="1.8" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="url(#gw2)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'reason-3': '<svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gw3" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="#c2185b"/><stop offset="1" stop-color="#9c27b0"/></linearGradient></defs><rect x="1" y="3" width="15" height="13" stroke="url(#gw3)" stroke-width="1.8" stroke-linejoin="round"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" stroke="url(#gw3)" stroke-width="1.8" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="url(#gw3)" stroke-width="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke="url(#gw3)" stroke-width="1.8"/></svg>',
    'reason-4': '<svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gw4" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="#c2185b"/><stop offset="1" stop-color="#9c27b0"/></linearGradient></defs><path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="url(#gw4)" stroke-width="1.8" stroke-linecap="round"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" stroke="url(#gw4)" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    'reason-5': '<svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gw5" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="#c2185b"/><stop offset="1" stop-color="#9c27b0"/></linearGradient></defs><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="url(#gw5)" stroke-width="1.8" stroke-linejoin="round"/><line x1="7" y1="7" x2="7.01" y2="7" stroke="url(#gw5)" stroke-width="3" stroke-linecap="round"/><line x1="15" y1="9" x2="9" y2="15" stroke="url(#gw5)" stroke-width="1.8" stroke-linecap="round"/></svg>',
    'reason-6': '<svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gw6" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="#c2185b"/><stop offset="1" stop-color="#9c27b0"/></linearGradient></defs><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" stroke="url(#gw6)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" stroke="url(#gw6)" stroke-width="1.8" stroke-linecap="round"/></svg>',
}

for reason_id, svg in icons.items():
    pattern = r'(id="' + reason_id + r'">\s*<div class="reason-icon">)[^<]*(</div>)'
    replacement = r'\g<1>' + svg + r'\g<2>'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done! Icons replaced successfully.')
