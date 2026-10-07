# airtribe.show

Statický web skupiny Air Tribe (HTML + CSS + JS, bez buildu a knihoven).
Nasazení stejně jako filipdvorak.cz — vlastní GitHub repozitář + Vercel.

## Struktura

| Soubor / složka | K čemu je |
|---|---|
| `index.html` | Úvod, pro koho, podrobná nabídka (vystoupení, workshopy, show s workshopem / akce na míru), proč my, fotogalerie, poptávka |
| `onas.html` | O nás — fotka s fakty, kdo jsme, medailonky členů týmu (okno uprostřed stránky) |
| `kontakt.html` | Zelená stránka: kontakty, jednoduchý formulář (jméno, e-mail, zpráva) přes Web3Forms, ohlasy v karuselu, fakturační údaje |
| `404.html` | stránka pro neexistující adresu |
| `style.css` | celý vzhled (barvy a písma nahoře v `:root`) |
| `main.js` | menu, karusely, medailonky, formulář |
| `img/` | fotky, reference a ikony |

Písma **Manrope** (nadpisy) a **Inter** (text) z Google Fonts, doplňková barva `--accent: #4fb8ec`.

## Karusely (fotogalerie a ohlasy)

Blok `<div class="carousel" data-carousel …>` — každý snímek je `<div class="car-slide">…</div>`
uvnitř `.car-track`. Stačí přidat nebo ubrat snímek, tečky i nekonečná smyčka se dopočítají samy.

- `data-per-view="4,2,1"` — kolik snímků je vidět na počítači, tabletu a telefonu
- `data-interval="3500"` — po kolika milisekundách se karusel sám posune

Ovládání: šipky po stranách, tečky, šipky na klávesnici, tažení myší se zmáčknutým tlačítkem nebo prstem.
Při najetí kurzorem se automatický posun zastaví.

## Úprava medailonku

V `onas.html` najdi kartu člena týmu (komentář `===== Jméno =====`):

1. Text napiš do `<div class="member-bio">` — odstavce `<p>…</p>`, případně štítky
   `<ul class="tags"><li>…</li></ul>`. Řádek „Medailonek brzy doplníme“ smaž.
2. Fotku (na výšku, delší hrana ~1000 px) ulož do `img/tym/` a `<span class="m-initials">…</span>`
   nahraď `<img src="img/tym/soubor.jpg" alt="Jméno" loading="lazy">`.
3. Roli změníš v `data-role`, přezdívku v `data-nick` i v `<span class="m-nick">`.

Přímý odkaz na medailonek: `onas.html#fila`, `#patrik`, `#jenda`, `#milos`, `#kaja`.

## Formulář

Používá Web3Forms klíč z filipdvorak.cz, zprávy tedy chodí na e-mail, pod kterým je klíč
registrovaný. Pro doručení na teamairtribe@gmail.com vytvoř na web3forms.com nový klíč
a vyměň hodnotu `access_key` v `kontakt.html`.

## Fotky a mobil

Každá fotka má vedle sebe zmenšenou variantu `nazev-800.jpg`, kterou si telefony stáhnou místo plné verze
(v HTML je u obrázků `srcset`). Po přidání nové fotky do `img/` spusť v generátorech `python thumbs.py`
a znovu vygeneruj stránky — varianta i `srcset` se doplní samy.

## Rozbalovací podrobnosti v nabídce

Na mobilu a tabletu (do 1160 px) je tabulka s údaji u každé položky nabídky schovaná pod tlačítkem
„Podrobnosti“. Na počítači je vidět vždycky a tlačítko se nezobrazuje. Ovládá to `.pkg-toggle`
ve `style.css` a `main.js`.

Odkazy na `style.css` a `main.js` mají v HTML `?v=…` (konstanta `VER` v generátoru), aby si
prohlížeče po nasazení natáhly novou verzi.
