import os

locales_dir = 'src/locales'
files = [f for f in os.listdir(locales_dir) if f.endswith('.json')]

replacement = '''        "advancedMortgage": {
            "name": "Advanced Mortgage Calculator",
            "desc": "Calculate home loan with prepayments, extra EMI and 80C/24 tax benefits"
        },
        "personalLoan": {'''

target = '        "personalLoan": {'

for f in files:
    path = os.path.join(locales_dir, f)
    with open(path, 'r', encoding='utf-8') as file:
        text = file.read()
    
    if '"advancedMortgage":' not in text:
        text = text.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as file:
            file.write(text)
        print(f"Updated {f}")
