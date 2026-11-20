# TMR Mixer

Aplikacja do dawek TMR dla bydła mlecznego: https://tmr.fermapps.pl

## Jak to jest zbudowane
- `index.html` — cała aplikacja dostępna bez konta: Obliczanie wozu, Załadunek, Ustalanie dawki, Mieszanka treściwa, Notatki, Moje surowce.
- `protected/` — funkcje dodatkowe (Sita TMR, Konwerter FE, Mieszalnik). **Nie są publikowane na stronie.** Workflow wgrywa je do Firestore, a aplikacja pobiera je dopiero po zalogowaniu użytkownika, który ma do nich dostęp.
- `firestore.rules` — reguły bazy: kto może czytać który moduł.
- `firebase-config.js` — publiczna konfiguracja Firebase (nie jest tajna).
- `.github/workflows/deploy-hosting.yml` — po każdej zmianie na `main`: reguły Firestore → moduły → strona.

## Jak dodać użytkownika
1. Konsola Firebase → projekt **fermapps-tmrmixer** → **Authentication** → **Users** → **Add user**. Wpisz e-mail i hasło startowe.
2. Skopiuj **User UID** nowej osoby (kolumna UID na liście użytkowników).
3. **Firestore Database** → kolekcja `users` → **Add document** → **Document ID** = skopiowany UID. Pola:
   - `features` (array): wpisz funkcje, do których osoba ma mieć dostęp: `sita`, `fe`, `mieszalnik`
   - `active` (boolean): `true`
   - `name` (string): imię, opcjonalnie
4. Przekaż osobie e-mail i hasło. Hasło może zmienić sama: na ekranie logowania „Nie pamiętasz hasła?”.

## Jak odebrać dostęp
- Do jednej funkcji: usuń ją z listy `features`.
- Do wszystkich: ustaw `active` na `false` albo usuń dokument w `users`. Najmocniej: Authentication → wyłącz (Disable) albo usuń konto.

Przy następnym uruchomieniu z internetem aplikacja usunie z urządzenia kod funkcji, do których dostęp został odebrany.
