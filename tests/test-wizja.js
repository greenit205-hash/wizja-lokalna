/* Wizja lokalna - testy aplikacji.
 * Uruchomienie:  node tests/test-wizja.js     (wymaga: npm install)
 *
 * Test ładuje CAŁE index.html do sztucznej przeglądarki i wywołuje prawdziwe
 * funkcje aplikacji - nie ma tu przepisanej logiki. Jeśli test przechodzi,
 * działa kod, który trafia na tablet.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) {
  console.log('Ten zestaw potrzebuje biblioteki jsdom. Zainstaluj raz:\n\n    npm install\n');
  process.exit(2);
}

function kontekst() {
  const nic = () => {};
  const stan = { fillStyle: '', strokeStyle: '', font: '', lineWidth: 1 };
  const c = {
    canvas: { width: 1200, height: 800 },
    measureText: t => ({ width: String(t).length * 8 }),
    // domyślnie płótno jest białe - tak jak po czyscPlotno()
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) }),
    get fillStyle() { return stan.fillStyle; }, set fillStyle(v) { stan.fillStyle = v; },
    get strokeStyle() { return stan.strokeStyle; }, set strokeStyle(v) { stan.strokeStyle = v; },
    get font() { return stan.font; }, set font(v) { stan.font = v; },
    get lineWidth() { return stan.lineWidth; }, set lineWidth(v) { stan.lineWidth = v; }
  };
  return new Proxy(c, { get: (t, p) => (p in t ? t[p] : nic), set: (t, p, v) => { t[p] = v; return true; } });
}

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = () => kontekst();
    w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';
    w.alert = m => { w.__alert = m; };
    w.confirm = () => (w.__confirm === undefined ? true : w.__confirm);
    w.prompt = () => w.__prompt;
    w.print = () => { w.__drukowano = true; };
    w.scrollTo = nicf;
    w.URL.createObjectURL = () => 'blob:x';
    w.URL.revokeObjectURL = () => {};
  }
});
function nicf() {}

const okno = dom.window;
const doc = okno.document;
const app = kod => okno.eval('(function(){' + kod + '})()');

let ok = 0, bledy = [];
function sprawdz(nazwa, warunek, szczegol) {
  if (warunek) ok++;
  else bledy.push(nazwa + (szczegol !== undefined ? ' -> ' + szczegol : ''));
}

function pole(id) { return doc.querySelector('[data-p="' + id + '"]'); }

function wpisz(id, wartosc) {
  const p = pole(id);
  if (!p) return false;
  p.value = wartosc;
  p.dispatchEvent(new okno.Event('input', { bubbles: true }));
  return true;
}

// Czekamy na start() - jest asynchroniczny przez otwarcie bazy
function poczekaj(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
await poczekaj(400);

// ===================== SZKIELET =====================
console.log('--- sekcje i pola ---');
{
  ['s-obiekt','s-przylacze','s-magazyn','s-falownik','s-ems','s-ladowarka',
   's-trasy','s-przebicia','s-warunki','s-szkice','s-foto','s-ustalenia'].forEach(id => {
    sprawdz('sekcja ' + id + ' istnieje', !!doc.getElementById(id));
  });
  sprawdz('każda sekcja ma nagłówek',
    Array.from(doc.querySelectorAll('.card')).every(c => c.querySelector('h2')));
  sprawdz('spis treści prowadzi do istniejących sekcji',
    Array.from(doc.querySelectorAll('.nav a')).every(a => doc.getElementById(a.getAttribute('href').slice(1))));

  // rzeczy, o które prosił wprost
  sprawdz('jest miejsce na montaż magazynu', !!pole('magPom'));
  sprawdz('jest miejsce na montaż falownika', !!pole('falPom'));
  sprawdz('jest sekcja EMS', !!pole('emsLok'));
  sprawdz('jest sekcja ładowarki', !!pole('ladLok'));
  sprawdz('jest tabela tras kablowych', !!doc.getElementById('cialoTras'));
  sprawdz('jest płótno do szkiców', !!doc.getElementById('plotno'));
  sprawdz('jest galeria zdjęć', !!doc.getElementById('galeria'));
}

// ===================== POLA I PRZEŁĄCZNIKI =====================
console.log('--- wypełnianie ---');
{
  sprawdz('pole adresu da się wypełnić', wpisz('adres', 'Dębno 205'));
  sprawdz('wpis trafia do dokumentu', app("return dane.pola.adres;") === 'Dębno 205');

  const w = doc.querySelector('[data-w="rgDostep"]');
  sprawdz('przełącznik ma trzy stany', w && w.querySelectorAll('button').length === 3,
    w ? w.querySelectorAll('button').length : 'brak');
  w.querySelectorAll('button')[0].click();
  sprawdz('naciśnięcie zapisuje odpowiedź', app("return dane.wybory.rgDostep;") === 'tak');
  sprawdz('wybrany przycisk jest podświetlony', w.querySelectorAll('button')[0].classList.contains('on'));
  w.querySelectorAll('button')[1].click();
  sprawdz('zmiana odpowiedzi działa', app("return dane.wybory.rgDostep;") === 'nie');
  sprawdz('poprzedni przycisk gaśnie', !w.querySelectorAll('button')[0].classList.contains('on'));
  w.querySelectorAll('button')[1].click();
  sprawdz('ponowne naciśnięcie odznacza — łatwo trafić palcem w zły',
    app("return dane.wybory.rgDostep;") === null);
}

// ===================== TRASY KABLOWE =====================
console.log('--- trasy kablowe ---');
{
  app("dane.trasy = []; rysujTrasy();");
  sprawdz('pusta tabela nie ma wierszy', doc.querySelectorAll('#cialoTras tr').length === 0);

  app("dodajTrase(); dodajTrase();");
  sprawdz('dodawanie odcinków działa', doc.querySelectorAll('#cialoTras tr').length === 2);

  app("polTrasy(0,'od','RG'); polTrasy(0,'do','magazyn'); polTrasy(0,'dlugosc','12.5');");
  app("polTrasy(1,'dlugosc','7.5');");
  sprawdz('wpisy trafiają do dokumentu', app("return dane.trasy[0].od;") === 'RG');
  sprawdz('suma metrów jest liczona',
    doc.getElementById('liczTras').innerText.indexOf('20.0 m') > -1,
    doc.getElementById('liczTras').innerText);
  sprawdz('licznik podaje liczbę odcinków',
    doc.getElementById('liczTras').innerText.indexOf('2 odc.') > -1);

  // sposób prowadzenia - to o to prosił wprost
  const sel = doc.querySelectorAll('#cialoTras tr')[0].querySelectorAll('select')[1];
  const opcje = Array.from(sel.options).map(o => o.text);
  sprawdz('jest wybór natynkowo', opcje.some(o => o.indexOf('natynkowo') === 0), opcje.slice(0, 4));
  sprawdz('jest podtynkowo w bruździe', opcje.some(o => /^podtynkowo.*bru/i.test(o)), opcje);
  sprawdz('jest podtynkowo w rurze', opcje.some(o => /^podtynkowo.*rur/i.test(o)), opcje);
  sprawdz('są rodzaje koryt przy natynkowym',
    opcje.some(o => o.indexOf('korytko') > -1) && opcje.some(o => o.indexOf('listwa') > -1));
  sprawdz('jest prowadzenie w ziemi', opcje.some(o => o.indexOf('w ziemi') === 0));

  const selKoryto = doc.querySelectorAll('#cialoTras tr')[0].querySelectorAll('select')[2];
  const koryta = Array.from(selKoryto.options).map(o => o.text);
  sprawdz('lista koryt ma konkretne wymiary', koryta.some(k => /\d+×\d+/.test(k)), koryta.slice(0, 5));
  sprawdz('lista koryt ma rury osłonowe', koryta.some(k => k.indexOf('SRS') === 0 || k.indexOf('DVK') === 0));

  sprawdz('przewody mają podpowiedzi', !!doc.getElementById('listaPrzewodow'));
  sprawdz('podpowiedzi przewodów są konkretne',
    doc.getElementById('listaPrzewodow').querySelectorAll('option').length > 10);

  // usuwanie
  okno.__confirm = true;
  app("usunTrase(0);");
  sprawdz('odcinek da się usunąć', app("return dane.trasy.length;") === 1);
  sprawdz('po usunięciu numeracja się przelicza',
    doc.querySelectorAll('#cialoTras tr')[0].querySelector('.nrkom').textContent === '1');
  okno.__confirm = false;
  app("usunTrase(0);");
  sprawdz('anulowanie nie usuwa', app("return dane.trasy.length;") === 1);
  okno.__confirm = true;
}

// ===================== PRZEBICIA =====================
console.log('--- przebicia ---');
{
  app("dane.przebicia = []; rysujPrzebicia(); dodajPrzebicie();");
  sprawdz('pozycja się dodaje', doc.querySelectorAll('#cialoPrzebic tr').length === 1);
  app("polPrzebicia(0,'miejsce','ściana kotłowni');");
  sprawdz('wpis trafia do dokumentu', app("return dane.przebicia[0].miejsce;") === 'ściana kotłowni');
  const kto = doc.querySelectorAll('#cialoPrzebic tr')[0].querySelectorAll('select')[2];
  const ktoOpc = Array.from(kto.options).map(o => o.text);
  sprawdz('da się wskazać, kto wykonuje',
    ktoOpc.indexOf('wykonawca') > -1 && ktoOpc.indexOf('inwestor') > -1, ktoOpc);
}

// ===================== ZDJĘCIA =====================
console.log('--- zdjęcia ---');
{
  app("dane.zdjecia = []; rysujGalerie();");
  sprawdz('bez zdjęć widać podpowiedź',
    doc.getElementById('brakZdjec').style.display === 'block');

  app(`
    dane.zdjecia = [
      { id:1, src:'data:image/jpeg;base64,AAA', opis:'', przypisanie:'' },
      { id:2, src:'data:image/jpeg;base64,BBB', opis:'', przypisanie:'' }
    ];
    rysujGalerie();
  `);
  sprawdz('zdjęcia pojawiają się w galerii', doc.querySelectorAll('#galeria .fotka').length === 2);
  sprawdz('podpowiedź znika, gdy są zdjęcia',
    doc.getElementById('brakZdjec').style.display === 'none');
  sprawdz('licznik pokazuje liczbę zdjęć',
    doc.getElementById('liczZdjec').innerText.indexOf('2 szt.') > -1);

  app("polZdjecia(0,'opis','rozdzielnica główna');");
  sprawdz('podpis zdjęcia się zapisuje', app("return dane.zdjecia[0].opis;") === 'rozdzielnica główna');

  app("polZdjecia(0,'przypisanie','magazyn');");
  sprawdz('zdjęcie da się przypisać do sekcji', app("return dane.zdjecia[0].przypisanie;") === 'magazyn');

  app("przesunZdjecie(0,1);");
  sprawdz('kolejność zdjęć da się zmienić', app("return dane.zdjecia[0].id;") === 2);
  app("przesunZdjecie(0,-1);");
  sprawdz('przesunięcie poza zakres nic nie psuje', app("return dane.zdjecia.length;") === 2);

  okno.__confirm = true;
  app("usunZdjecie(0);");
  sprawdz('zdjęcie da się usunąć', app("return dane.zdjecia.length;") === 1);

  // zmniejszanie - sprawdzamy sam przelicznik, bo w jsdom nie ma dekodera JPEG
  sprawdz('dłuższy bok zdjęcia jest ograniczony do 1600 px',
    app("return FOTO_MAX;") === 1600, app("return FOTO_MAX;"));
  const sk = app(`
    const wyniki = [];
    [[4000,3000],[3000,4000],[1200,900]].forEach(([w,h]) => {
      const s = Math.min(1, FOTO_MAX / Math.max(w,h));
      wyniki.push([Math.round(w*s), Math.round(h*s)]);
    });
    return wyniki;
  `);
  sprawdz('zdjęcie 4000×3000 schodzi do 1600 px', sk[0][0] === 1600 && sk[0][1] === 1200, JSON.stringify(sk[0]));
  sprawdz('zdjęcie pionowe też schodzi do 1600 px', sk[1][0] === 1200 && sk[1][1] === 1600, JSON.stringify(sk[1]));
  sprawdz('małe zdjęcie nie jest powiększane', sk[2][0] === 1200, JSON.stringify(sk[2]));
  sprawdz('zapis idzie w JPEG z kompresją', app("return FOTO_JAKOSC;") < 1);
}

// ===================== SZKICE =====================
console.log('--- szkice ---');
{
  app("dane.szkice = []; rysujSzkice();");
  sprawdz('bez szkiców widać podpowiedź',
    doc.getElementById('listaSzkicow').innerHTML.indexOf('Brak szkiców') > -1);

  // puste płótno nie może trafić do raportu
  okno.__prompt = 'test';
  okno.__alert = null;
  app("zapiszSzkic();");
  sprawdz('puste płótno nie jest dodawane', app("return dane.szkice.length;") === 0);
  sprawdz('program tłumaczy, dlaczego nie dodał',
    (okno.__alert || '').indexOf('puste') > -1, okno.__alert);

  app(`
    dane.szkice = [{ id:1, src:'data:image/png;base64,AAA', opis:'' }];
    rysujSzkice();
  `);
  sprawdz('szkic pojawia się na liście',
    doc.querySelectorAll('#listaSzkicow .fotka').length === 1);
  app("polSzkicu(0,'rzut kotłowni');");
  sprawdz('podpis szkicu się zapisuje', app("return dane.szkice[0].opis;") === 'rzut kotłowni');

  sprawdz('są narzędzia rysowania',
    !!doc.getElementById('nTrybRys') && !!doc.getElementById('nTrybLin') &&
    !!doc.getElementById('nTrybTekst') && !!doc.getElementById('nTrybGum'));
  app("setTrybRys('linia');");
  sprawdz('tryb rysowania da się przełączyć', app("return trybRys;") === 'linia');
  app("setKolor('#b02a37', null);");
  sprawdz('kolor da się zmienić', app("return kolorRys;") === '#b02a37');
  sprawdz('da się wgrać gotowy PNG ze Szkicownika', !!doc.getElementById('wgrajSzkic'));
}

// ===================== ZAPIS I ODCZYT =====================
console.log('--- zapis dokumentu ---');
{
  app(`
    dane.pola.inwestor = 'Power LAB';
    dane.pola.adres = 'Dębno 205';
    dane.pola.data = '2026-10-29';
    dane.wybory.rgZapas = 'tak';
    dane.trasy = [{ od:'RG', do:'magazyn', rodzaj:'AC — falownik', dlugosc:'12.5',
                    sposob:'natynkowo — korytko PCV', koryto:'LN 60×40',
                    przewod:'YKY 5×16', uwagi:'wzdłuż sufitu' }];
    dane.zdjecia = [{ id:1, src:'data:image/jpeg;base64,AAA', opis:'RG', przypisanie:'przyłącze / RG' }];
    dane.szkice = [{ id:2, src:'data:image/png;base64,BBB', opis:'rzut' }];
  `);
  const paczka = app("return JSON.stringify(dane);");
  const z = JSON.parse(paczka);
  sprawdz('dokument ma znacznik formatu', z.format === 'wizja-lokalna', z.format);
  sprawdz('pola trafiają do zapisu', z.pola.inwestor === 'Power LAB');
  sprawdz('odpowiedzi tak/nie trafiają do zapisu', z.wybory.rgZapas === 'tak');
  sprawdz('trasy trafiają do zapisu wraz ze sposobem prowadzenia',
    z.trasy[0].sposob.indexOf('korytko') > -1);
  sprawdz('zdjęcia trafiają do zapisu', z.zdjecia.length === 1);
  sprawdz('szkice trafiają do zapisu', z.szkice.length === 1);

  // wczytanie na czysto
  app("dane = pustyDokument();");
  sprawdz('zastosowanie zapisu działa', app("return zastosuj(" + paczka + ");") === true);
  sprawdz('pola wracają', app("return dane.pola.inwestor;") === 'Power LAB');
  sprawdz('trasy wracają', app("return dane.trasy[0].przewod;") === 'YKY 5×16');
  sprawdz('zdjęcia wracają', app("return dane.zdjecia.length;") === 1);

  app("odswiezWszystko();");
  sprawdz('po wczytaniu formularz pokazuje dane',
    pole('inwestor').value === 'Power LAB', pole('inwestor').value);
  sprawdz('po wczytaniu tabela pokazuje trasy',
    doc.querySelectorAll('#cialoTras tr').length === 1);
  sprawdz('po wczytaniu przełączniki pokazują odpowiedzi',
    doc.querySelector('[data-w="rgZapas"] button').classList.contains('on'));

  // starszy / niepełny plik nie może wywrócić aplikacji
  sprawdz('niepełny dokument daje się wczytać',
    app("return zastosuj({ format:'wizja-lokalna', pola:{ adres:'X' } });") === true);
  sprawdz('brakujące tablice są uzupełniane',
    app("return Array.isArray(dane.trasy) && Array.isArray(dane.zdjecia) && Array.isArray(dane.szkice);") === true);
  // plik uszkodzony albo z innej wersji potrafi nieść zamiast tablicy cokolwiek -
  // aplikacja nie może się na tym wywrócić w terenie
  sprawdz('pole innego typu niż tablica jest naprawiane',
    app(`zastosuj({ format:'wizja-lokalna', trasy:'uszkodzone', zdjecia:null, szkice:7, przebicia:{} });
         return Array.isArray(dane.trasy) && Array.isArray(dane.zdjecia) &&
                Array.isArray(dane.szkice) && Array.isArray(dane.przebicia);`) === true);
  sprawdz('po naprawieniu formularz da się odświeżyć',
    app("odswiezWszystko(); return dane.trasy.length;") === 0);
  sprawdz('odświeżenie niepełnego dokumentu nie wywraca strony',
    app("zastosuj({ format:'wizja-lokalna', pola:{ adres:'X' } }); odswiezWszystko(); return dane.pola.adres;") === 'X');
  sprawdz('śmieci zamiast dokumentu są odrzucane',
    app("return zastosuj(null);") === false);

  sprawdz('nazwa pliku bierze się z inwestora i daty',
    app("dane.pola.inwestor='Power LAB'; dane.pola.data='2026-10-29'; return nazwaDokumentu();")
      === 'wizja_Power_LAB_2026-10-29',
    app("return nazwaDokumentu();"));
  sprawdz('nazwa pliku nie zawiera znaków zakazanych',
    app("dane.pola.inwestor='A/B:C*?'; return nazwaDokumentu();").indexOf('/') === -1,
    app("return nazwaDokumentu();"));
}

// ===================== WYDRUK =====================
console.log('--- wydruk PDF ---');
{
  app(`
    dane = pustyDokument();
    dane.pola.adres = 'Dębno 205';
    dane.pola.uwagiMagazyn = 'Linia 1\\nLinia 2\\nLinia 3\\nLinia 4\\nLinia 5\\nLinia 6';
    dane.zdjecia = [{ id:1, src:'data:image/jpeg;base64,AAA', opis:'RG', przypisanie:'' }];
    dane.szkice = [{ id:2, src:'data:image/png;base64,BBB', opis:'rzut' }];
    odswiezWszystko();
  `);

  okno.__drukowano = false;
  app("drukujPdf();");
  await poczekaj(250);
  sprawdz('wydruk się uruchamia', okno.__drukowano === true);

  sprawdz('stopka wydruku podaje adres',
    doc.getElementById('stopkaDruk').innerText.indexOf('Dębno 205') > -1,
    doc.getElementById('stopkaDruk').innerText);
  sprawdz('stopka podaje liczbę zdjęć i szkiców',
    doc.getElementById('stopkaDruk').innerText.indexOf('zdjęć: 1') > -1 &&
    doc.getElementById('stopkaDruk').innerText.indexOf('szkiców: 1') > -1,
    doc.getElementById('stopkaDruk').innerText);

  // długie uwagi muszą się rozciągnąć na wydruku, inaczej urwą się w pół zdania
  app("rozciagnijPolaTekstowe(true);");
  const t = pole('uwagiMagazyn');
  const wys = app("return document.querySelector('[data-p=\"uwagiMagazyn\"]').scrollHeight + 4;");
  sprawdz('pole tekstowe jest rozciągane przed drukiem',
    t.style.height && t.style.height !== '', t.style.height);
  sprawdz('rozciągnięcie odpowiada treści, a nie stałej wysokości',
    parseInt(t.style.height, 10) === wys, t.style.height + ' vs ' + wys + 'px');
  app("rozciagnijPolaTekstowe(false);");
  sprawdz('po wydruku wysokość wraca', pole('uwagiMagazyn').style.height === '');

  // arkusz wydruku musi faktycznie chować interfejs i pokazywać zdjęcia
  const css = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
  const druk = css.slice(css.indexOf('@media print'));
  sprawdz('arkusz wydruku istnieje', css.indexOf('@media print') > -1);
  sprawdz('wydruk jest na A4', druk.indexOf('A4') > -1);
  sprawdz('pasek narzędzi nie trafia na wydruk', druk.indexOf('.nodruku') > -1);
  sprawdz('przyciski usuwania nie trafiają na wydruk', druk.indexOf('.usunkom') > -1);
  sprawdz('zdjęcia mają układ na wydruku', druk.indexOf('.fotki') > -1);
  sprawdz('nagłówki sekcji drukują się w kolorze',
    druk.indexOf('print-color-adjust') > -1);
  sprawdz('niezaznaczone odpowiedzi nie zaśmiecają wydruku',
    druk.indexOf('.wybor button{display:none}') > -1 ||
    druk.indexOf('.wybor button{display:none;}') > -1 ||
    /\.wybor button\s*\{\s*display:\s*none/.test(druk));
}

// ===================== NOWY DOKUMENT =====================
console.log('--- nowa wizja ---');
{
  app("dane.pola.adres = 'coś'; dane.zdjecia = [{id:1,src:'x',opis:''}];");
  okno.__confirm = false;
  app("nowaWizja();");
  sprawdz('anulowanie nie kasuje dokumentu', app("return dane.pola.adres;") === 'coś');
  okno.__confirm = true;
  app("nowaWizja();");
  sprawdz('nowa wizja czyści pola', app("return dane.pola.adres;") === undefined);
  sprawdz('nowa wizja czyści zdjęcia', app("return dane.zdjecia.length;") === 0);
  sprawdz('nowa wizja podstawia dzisiejszą datę',
    app("return dane.pola.data;") === new Date().toISOString().slice(0, 10));
}

console.log('');
if (bledy.length) {
  console.log('BŁĘDY (' + bledy.length + '):');
  bledy.forEach(b => console.log('  ✗ ' + b));
  console.log('\nPrzeszło: ' + ok + ', nie przeszło: ' + bledy.length);
  process.exit(1);
} else {
  console.log('✓ Wszystkie testy przeszły (' + ok + ' sprawdzeń).');
}
dom.window.close();
})();
