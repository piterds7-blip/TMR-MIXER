# TMR Mixer

Aplikacja do dawek TMR dla bydła mlecznego: https://tmr.fermapps.pl

## Jak to jest zbudowane
- `index.html` — cała aplikacja dostępna bez konta: Obliczanie wozu, Załadunek, Ustalanie dawki, Mieszanka treściwa, Notatki, Moje surowce.
- **Moduły funkcji dodatkowych** (Sita TMR, Konwerter FE, Mieszalnik) **nie są w tym repozytorium**. Leżą w prywatnym repozytorium `piterds7-blip/tmr-mixer-moduly` w folderze `protected/`. Workflow pobiera je stamtąd i wgrywa do Firestore. Bez sekretu `MODULY_TOKEN` ten krok jest pominięty, a moduły zostają takie, jakie są w bazie.
- `firestore.rules` — reguły bazy: kto może czytać który moduł.
- `firebase-config.js` — publiczna konfiguracja Firebase (nie jest tajna).
- `.github/workflows/deploy-hosting.yml` — po każdej zmianie na `main`: reguły Firestore → moduły z prywatnego repozytorium (jeśli jest sekret) → strona.

## Aktualizacja modułów
Zmiany w funkcjach dodatkowych wprowadzasz w prywatnym repozytorium `tmr-mixer-moduly`, a potem uruchamiasz workflow (zakładka Actions → Deploy → Run workflow). Nie ma ich w tym repozytorium.

## Kto ma dostęp
- **Osoby z firmowym adresem** (np. `@biofeed.pl`): zakładają konto same w aplikacji (**Zaloguj się → Nie masz konta? Załóż konto**), potwierdzają adres linkiem z e-maila i dostają funkcje przypisane domenie. Nic nie musisz dodawać ręcznie.
- **Pozostali:** konto można przypisać indywidualnie (sekcja poniżej).

## Jak ustawić funkcje dla domeny (raz)
1. Konsola Firebase → projekt **fermapps-tmrmixer** → **Firestore Database** → **Start collection**.
2. ID kolekcji: `config`. ID dokumentu: `domeny`.
3. Pole: nazwa `biofeed.pl`, typ **array**, wartości: `sita`, `fe`, `mieszalnik` (każda w osobnym wierszu).
4. Zapisz. Od tej chwili każdy, kto założy konto na `@biofeed.pl` i potwierdzi adres, ma te funkcje.

Język wiadomości potwierdzającej: Authentication → Templates → Email address verification (można ustawić po polsku).

## Jak dodać pojedynczą osobę (inna domena)
1. Authentication → Users → Add user: e-mail i hasło startowe.
2. Skopiuj **User UID**.
3. Firestore → kolekcja `users` → Add document → ID = UID. Pola: `features` (array: `sita`, `fe`, `mieszalnik`), `active` (boolean `true`).

## Jak odebrać dostęp
- Do jednej funkcji: usuń ją z listy `features`.
- Do domeny: usuń funkcję z listy w `config/domeny`.
- Do wszystkich osób indywidualnie: ustaw `active` na `false` albo usuń dokument w `users`. Najmocniej: Authentication → wyłącz (Disable) albo usuń konto.

Przy następnym uruchomieniu z internetem aplikacja usunie z urządzenia kod funkcji, do których dostęp został odebrany.
