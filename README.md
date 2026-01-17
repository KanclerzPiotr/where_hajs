# WhereHajs

Aplikacja desktopowa do analizy i kategoryzacji transakcji bankowych. Importuj wyciagi z banku, przypisuj kategorie i analizuj swoje wydatki.

## Funkcje

### Import danych
- Import plikow CSV z banku
- Automatyczne wykrywanie formatu i kodowania pliku
- Elastyczne mapowanie kolumn - sam decydujesz co jest data, opisem i kwota
- Zapisywanie konfiguracji mapowania jako preset do ponownego uzycia

### Kategoryzacja
- Tworzenie wlasnych kategorii z kolorami
- Automatyczne przypisywanie kategorii na podstawie slow kluczowych w opisie transakcji
- Reczne przypisywanie kategorii jednym kliknieciem
- Grupowanie kategorii (np. grupa "Jedzenie" zawierajaca kategorie Biedronka, Lidl, Zabka)
- Filtrowanie widoku po kategorii lub grupie

### Laczenie danych z wielu plikow
- Import dodatkowych transakcji z nowych plikow
- Automatyczne wykrywanie duplikatow przy nakladajacych sie okresach
- Podglad przed importem z mozliwoscia wyboru co zaimportowac

### Analiza wydatkow
- Podsumowanie wszystkich transakcji
- Wykres kolowy wydatkow wedlug kategorii
- Filtrowanie po zakresie dat
- Podglad w trybie kategorii lub grup

### Zapis i kontynuacja pracy
- Zapis calego projektu do pliku JSON
- Szybki dostep do ostatnio otwartego projektu
- Pytanie o zapis przy zamykaniu aplikacji z niezapisanymi zmianami

### Inne
- Pelna praca offline - aplikacja nie wymaga internetu
- Wersja portable - pojedynczy plik exe bez instalacji

## Instalacja

```bash
npm install
npm run dev
```

## Budowanie

```bash
npm run build:win
```

Pliki wykonywalne w folderze `dist/`:
- `wherehajs-1.0.0-setup.exe` - Instalator
- `wherehajs-1.0.0-portable.exe` - Wersja portable

## Licencja

MIT
