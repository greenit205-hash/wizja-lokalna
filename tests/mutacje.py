#!/usr/bin/env python3
# Testy mutacyjne: psujemy kod celowo i sprawdzamy, czy testy to wylapia.
# Test, ktory przechodzi na zepsutym kodzie, jest tylko ozdoba.
import pathlib, subprocess, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
IDX = ROOT / 'index.html'
KOPIA = ROOT / 'index.html.bak'

MUTACJE = [
    ('suma metrow tras nie jest liczona',
     "  const suma = dane.trasy.reduce((a, t) => a + (parseFloat(t.dlugosc) || 0), 0);",
     "  const suma = 0;"),

    ('zdjecia nie sa zmniejszane przy wgrywaniu',
     "const FOTO_MAX = 1600;",
     "const FOTO_MAX = 99999;"),

    ('zdjecia zapisywane bez kompresji',
     "const FOTO_JAKOSC = 0.72;",
     "const FOTO_JAKOSC = 1;"),

    ('ponowne nacisniecie przelacznika nie odznacza',
     "        dane.wybory[klucz] = (dane.wybory[klucz] === b.dataset.k) ? null : b.dataset.k;",
     "        dane.wybory[klucz] = b.dataset.k;"),

    ('wybrana odpowiedz nie jest podswietlana',
     "    b.classList.toggle('on', on);",
     "    b.classList.toggle('on', false);"),

    ('puste plotno trafia do raportu',
     "  if (plotnoPuste()) { alert('Płótno jest puste — nie ma czego dodać.'); return; }",
     "  if (false) { return; }"),

    ('podpis zdjecia nie jest zapisywany',
     "  dane.zdjecia[i][pole] = wartosc;",
     "  // bez zapisu"),

    ('kolejnosc zdjec nie da sie zmienic',
     "  dane.zdjecia[i] = dane.zdjecia[j];\n  dane.zdjecia[j] = t;",
     "  // bez przestawiania"),

    ('wczytanie nie uzupelnia brakujacych tablic',
     "  ['trasy', 'przebicia', 'zdjecia', 'szkice'].forEach(k => {\n    if (!Array.isArray(dane[k])) dane[k] = [];\n  });",
     "  // bez uzupelniania"),

    ('smieci zamiast dokumentu sa przyjmowane',
     "  if (!z || typeof z !== 'object') return false;",
     "  if (false) return false;"),

    ('nazwa pliku nie czysci znakow zakazanych',
     "  return String(s || '').replace(/[\\\\/:*?\"<>|]+/g, '-').replace(/\\s+/g, '_').slice(0, 60);",
     "  return String(s || '').slice(0, 60);"),

    ('pola tekstowe nie sa rozciagane przed drukiem - tresc urwana w polowie',
     "      t.style.height = (t.scrollHeight + 4) + 'px';",
     "      t.style.height = '20px';"),

    ('wysokosc pol nie wraca po wydruku',
     "      t.style.height = t.dataset.wys || '';\n      delete t.dataset.rozciagniete;",
     "      delete t.dataset.rozciagniete;"),

    ('dwukrotne rozciagniecie gubi pierwotna wysokosc',
     "      if (t.dataset.rozciagniete === '1') return;",
     "      if (false) return;"),

    ('stopka wydruku nie podaje liczby zdjec',
     "    ' · zdjęć: ' + dane.zdjecia.length + ', szkiców: ' + dane.szkice.length;",
     "    '';"),

    ('wydruk nie chowa paska narzedzi',
     ".topbar,.nav,.nodruku,.btn,.usunkom,.okno{display:none !important}",
     ".topbar{display:none !important}"),

    ('niezaznaczone odpowiedzi zasmiecaja wydruk',
     "  .wybor button{display:none}",
     "  .wybor button{display:inline-block}"),

    ('nowa wizja nie czysci zdjec',
     "  dane = pustyDokument();\n  dane.pola.data = new Date().toISOString().slice(0, 10);",
     "  dane.pola = {};\n  dane.pola.data = new Date().toISOString().slice(0, 10);"),

    ('anulowanie i tak kasuje dokument',
     "  if (!confirm('Zacząć nową wizję?\\n\\nBieżąca zniknie z przeglądarki — jeśli ma zostać, najpierw zapisz ją do pliku.')) return;",
     "  confirm('x');"),

    ('lista sposobow prowadzenia bez opcji podtynkowych',
     "  'podtynkowo — bruzda',",
     "  'xxx',"),
]


def main():
    shutil.copy(IDX, KOPIA)
    oryginal = KOPIA.read_text(encoding='utf-8')
    zle = []
    try:
        for nazwa, stare, nowe in MUTACJE:
            n = oryginal.count(stare)
            if n != 1:
                zle.append(f'{nazwa}: wzorzec pasuje {n} razy — mutacja nieaktualna')
                print(f'  ✗ {nazwa}  [wzorzec {n}×]')
                continue
            IDX.write_text(oryginal.replace(stare, nowe), encoding='utf-8')
            r = subprocess.run(['node', 'tests/test-wizja.js'], cwd=ROOT,
                               capture_output=True, text=True, timeout=300)
            wykryte = (r.returncode != 0)
            print(f'  {"✓" if wykryte else "✗"} {nazwa}')
            if not wykryte:
                zle.append(f'{nazwa}: test PRZESZEDŁ na zepsutym kodzie')
    finally:
        IDX.write_text(oryginal, encoding='utf-8')
        KOPIA.unlink()

    print('')
    if zle:
        print(f'MUTACJE NIEWYKRYTE ({len(zle)}):')
        for z in zle:
            print('  ✗ ' + z)
        sys.exit(1)
    print(f'✓ Wszystkie {len(MUTACJE)} mutacji zostało wykrytych przez testy.')


main()
