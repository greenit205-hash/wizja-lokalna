# Wizja lokalna

Lista kontrolna do wypełnienia na tablecie podczas wizji lokalnej pod montaż
magazynu energii, systemu EMS i ładowarki samochodowej. Jeden plik
`index.html`, działa offline, dane zostają w przeglądarce.

---

## Co zawiera

**A. Obiekt i spotkanie** — adres, data, uczestnicy, nazwa postępowania.

**B. Przyłącze i rozdzielnica** — moc przyłączeniowa, zabezpieczenie
przedlicznikowe, taryfa, układ sieci, miejsce licznika i RG, wolne moduły,
istniejąca instalacja PV. Od tego zależy, czy magazyn i ładowarka w ogóle
zmieszczą się w mocy przyłączeniowej.

**C. Magazyn energii** — pomieszczenie, sposób montażu, wymiary, nośność
posadzki, temperatura, wentylacja, droga transportowa, wymagania p.poż.,
odległość do rozdzielnicy.

**D. Falownik** — lokalizacja, rodzaj ściany, wysokość montażu, odstępy,
zacienienie, odprowadzenie ciepła, hałas, odległości do magazynu i RG.

**E. EMS** — miejsce sterownika, zasilanie, łącze internetowe, punkt pomiarowy
i CT, magistrala (Modbus RTU/TCP, CAN), urządzenia do integracji, zdalny dostęp.

**F. Ładowarka** — lokalizacja, montaż, moc i typ, liczba punktów, trasa
zasilania, zabezpieczenie i RCD, nawierzchnia, roboty ziemne, sterowanie z EMS.

**G. Trasy kablowe** — tabela, jeden wiersz na odcinek: od–do, rodzaj
(DC / AC / komunikacja / LAN / PE / CT), długość, **sposób prowadzenia**
(natynkowo listwa / korytko PCV / korytko metalowe / drabinka / rura RL,
podtynkowo bruzda / rura karbowana, sufit podwieszany, kanał podłogowy,
w ziemi), **typ i wymiar koryta lub rury** (LS 12×12 … LN 100×60, drabinki,
RL, peszel, DVK, SRS), przewód z podpowiedziami, uwagi. Na dole suma metrów.

**H. Przebicia i prace budowlane** — miejsce, rodzaj, przegroda, wymiar, sztuki
i **kto wykonuje** (wykonawca / inwestor / do ustalenia).

**I. Warunki prowadzenia robót** — godziny dostępu, możliwe wyłączenia,
składowanie, dojazd, przepustki, rusztowanie, nadzór.

**J. Szkice** — rysowanie palcem (rysuj / linia / tekst / gumka, cztery kolory,
cofanie) albo wgranie gotowego PNG ze Szkicownika. Każdy szkic z podpisem.

**K. Dokumentacja fotograficzna** — zdjęcie z aparatu albo z galerii, podpis
i przypisanie do sekcji, zmiana kolejności. Zdjęcia są zmniejszane do 1600 px
i zapisywane jako JPEG, żeby plik nadawał się do wysłania.

**L. Ustalenia** — wnioski, co zapewnia inwestor, co do wyjaśnienia, podpisy.

---

## Obsługa

- **🖨️ PDF** — otwiera okno drukowania. W Chrome na Androidzie wybierz
  „Zapisz jako PDF". Wydruk jest na A4, bez pasków narzędzi i przycisków,
  ze zdjęciami po dwa w rzędzie i ze stopką (adres, data wydruku, liczba zdjęć).
- **💾 Zapisz JSON** — cały dokument razem ze zdjęciami do pliku.
  Nazwa bierze się z inwestora i daty.
- **📂 Wczytaj** — przywraca dokument z pliku.
- **🗒️ Nowa** — czysta wizja. Pyta o potwierdzenie.
- Autozapis w przeglądarce po każdej zmianie — widać go w prawym górnym rogu.

Przełączniki Tak / Nie / n/d: ponowne naciśnięcie odznacza, bo łatwo trafić
palcem w zły.

---

## Wdrożenie na GitHub Pages

1. Wgraj całą zawartość tego katalogu, razem z ukrytymi `.nojekyll` i `.github/`.
2. `Settings → Pages → Source = GitHub Actions` — **nie** „Deploy from a branch".
3. Na tablecie otwórz adres w Chrome i wybierz *Zainstaluj aplikację*.

### Po każdej zmianie w `index.html`

Podbij `CACHE_NAME` w `sw.js` (`wizja-v1` → `v2` …). Bez tego tablet zostanie
na starej wersji i będziesz szukał błędu, którego dawno nie ma w kodzie.

---

## Testy

```bash
npm install
npm test
npm run test:mutacje
```

Test ładuje całe `index.html` do sztucznej przeglądarki (jsdom) i wywołuje
prawdziwe funkcje aplikacji — nie ma tu przepisanej logiki. Testy mutacyjne
psują kod celowo i sprawdzają, czy testy to wyłapią; test, który przechodzi na
zepsutym kodzie, jest tylko ozdobą.

110 sprawdzeń, 20 mutacji.

---

## Na co uważać przy zmianach

**Pola tekstowe trzeba rozciągnąć przed wydrukiem.** Mają stałą wysokość i bez
`rozciagnijPolaTekstowe()` urwałyby treść w połowie zdania. Funkcja pilnuje też,
żeby dwukrotne wywołanie nie zapisało rozciągniętej wysokości jako „pierwotnej" —
zdarza się to, gdy przeglądarka nie wywoła `afterprint` i zadziała zapasowy timer.

**Zdjęcia nie mieszczą się w `localStorage`** (~5 MB na wszystko). Dokument
siedzi w IndexedDB; `localStorage` jest tylko zapasem i trzyma sam formularz bez
zdjęć — lepsze to niż utrata wpisów w prywatnym oknie.

**Wczytywany plik może nieść cokolwiek.** `zastosuj()` naprawia pola, które nie
są tablicami — plik z innej wersji nie może wywrócić aplikacji w terenie.

**Niezaznaczone odpowiedzi nie trafiają na wydruk** — na papierze zostaje tylko
ta wybrana, inaczej każdy wiersz miałby trzy przyciski.
