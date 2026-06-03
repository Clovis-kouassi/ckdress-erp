import io

with io.open(r'app\dashboard\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = "{ label: '\U0001F4CA Reporting', href: '/reporting', activites: ['ck_dress'] },"
new = old + "\n  { label: 'Gestionnaire Stock', href: '/gestionnaire-stock', activites: ['ck_dress', 'ck_design', 'succes_design'] },"

if 'gestionnaire-stock' not in content:
    content = content.replace(old, new)

with io.open(r'app\dashboard\page.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("OK")