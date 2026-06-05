# TMR Mixer — Instalacja PWA

## Struktura plików
```
tmr-pwa/
├── index.html      ← główna aplikacja
├── manifest.json   ← konfiguracja PWA
├── sw.js           ← service worker (offline)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Jak wrzucić na GitHub Pages (darmowy hosting)

### Krok 1 — Utwórz konto GitHub
Wejdź na https://github.com i zarejestruj się (bezpłatnie).

### Krok 2 — Utwórz nowe repozytorium
1. Kliknij "+" → "New repository"
2. Nazwa: `tmr-mixer` (lub dowolna)
3. Ustaw jako **Public**
4. Kliknij "Create repository"

### Krok 3 — Wgraj pliki
1. Kliknij "uploading an existing file"
2. Przeciągnij WSZYSTKIE pliki z folderu `tmr-pwa` (index.html, manifest.json, sw.js)
3. Przeciągnij folder `icons` z ikonami
4. Kliknij "Commit changes"

### Krok 4 — Włącz GitHub Pages
1. Wejdź w Settings → Pages
2. Source: "Deploy from branch"
3. Branch: `main` → folder: `/ (root)`
4. Kliknij Save

### Krok 5 — Gotowe!
Po chwili (1-2 min) aplikacja będzie dostępna pod adresem:
`https://TWOJA-NAZWA.github.io/tmr-mixer/`

## Instalacja na telefonie

### Android (Chrome):
1. Otwórz powyższy link w Chrome
2. Pojawi się baner "Zainstaluj aplikację" — kliknij
3. LUB: Menu (⋮) → "Dodaj do ekranu głównego"

### iPhone (Safari):
1. Otwórz powyższy link w Safari
2. Kliknij ikonę Udostępnij (□↑)
3. Wybierz "Dodaj do ekranu głównego"
4. Potwierdź "Dodaj"

Aplikacja działa w pełni offline po pierwszym otwarciu!
