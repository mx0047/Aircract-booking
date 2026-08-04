# SD Planes – Rezervačný Systém Lietadiel ✈️

## Prehľad

Mobilná webová aplikácia na rezerváciu ultraľahkých lietadiel Špaček SD-1 a SD-2 pre letisko Holíč (LZHL).

---

## Súborová Štruktúra

```
C:\Users\skubamro\.gemini\antigravity\scratch\aircraft-booking\
├── index.html                  # Hlavná HTML stránka
├── manifest.json               # PWA manifest
├── css/
│   └── styles.css              # Kompletný CSS (2100+ riadkov)
├── js/
│   ├── app.js                  # Hlavný kontrolér (~540 riadkov)
│   ├── data.js                 # Dátový model + localStorage
│   ├── vfr.js                  # VFR sunrise/sunset výpočty (NOAA)
│   ├── auth.js                 # Prihlásenie + registrácia
│   ├── booking.js              # Rezervačná logika + validácia
│   ├── calendar.js             # Kalendár + denný timeline
│   └── admin.js                # Admin panel (schvaľovanie)
└── img/                        # Priečinok pre logo
```

---

## Funkcionalita

### 🔐 Prihlásenie & Registrácia
- PIN-based login (4-ciferný kód)
- Registrácia nových pilotov (vyžaduje schválenie adminom)
- Logo SD PLANES s textovým fallbackom

### 📊 Dashboard
- Vitajte správa s menom pilota
- Štatistiky: počet lietadiel, moje rezervácie, čakajúce schválenia
- Najbližšia rezervácia
- VFR info pre dnešný deň (východ/západ slnka)

### ✈️ Lietadlá
- Zoznam lietadiel rozdelený podľa typu (SD-1, SD-2)
- Glassmorphism karty s registráciou, typom, počtom miest
- Kliknutie → otvorí kalendár pre dané lietadlo

### 📅 Kalendár
- Mesačný prehľad so slovenskými názvami dní a mesiacov
- Navigácia medzi mesiacmi
- Označenie dní s existujúcimi rezerváciami
- **Denný timeline (04:00 – 22:00)**:
  - 🟢 VFR zóna (zelená) – lietateľné hodiny
  - 🔴 Nočná zóna (červená) – nelietateľné
  - Sunrise/sunset markery
  - Existujúce rezervácie ako farebné bloky
  - Kliknutie na voľný VFR slot → vytvorenie rezervácie

### 📝 Rezervácia
- Formulár: dátum/čas od-do, účel letu, poznámka
- **Validácia**:
  - Min. 20 minút
  - Musí byť v budúcnosti
  - Celý rozsah v rámci VFR okna
  - Žiadne kolízie s existujúcimi rezerváciami
- VFR informácie zobrazené pri formulári

### 🛡️ Admin Panel
- **Schvaľovanie**: čakajúce rezervácie + čakajúci používatelia
- **Používatelia**: správa účtov (schváliť/odobrať prístup)
- **Flotila**: pridanie/odobranie lietadiel
- Badge na navigácii s počtom čakajúcich žiadostí

---

## Demo Prihlasovacie Údaje

| Meno | PIN | Rola | Status |
|------|-----|------|--------|
| Igor Špaček | 0000 | Majiteľ (admin) | ✅ Aktívny |
| Mária Kováčová | 9999 | Zástupca (admin) | ✅ Aktívny |
| Ján Novák | 1234 | Pilot | ✅ Aktívny |
| Peter Horváth | 5678 | Pilot | ⏳ Čaká na schválenie |

---

## Flotila Lietadiel

| Typ | Registrácia | Miesta |
|-----|-------------|--------|
| SD-1 Minisport | OK-VUR | 1 |
| SD-2 SportMaster | OK-BUR37 | 2 |
| SD-2 SportMaster | OK-UUR02 | 2 |

---

## Spustenie

Keďže aplikácia používa ES6 moduly, musí byť servovaná cez HTTP server:

```bash
# Python
python -m http.server 3000

# Node.js (ak máte nainštalované)
npx serve . -l 3000

# Live Server vo VS Code
# Otvorte index.html a kliknite "Go Live"
```

Potom otvorte `http://localhost:3000` v prehliadači.

> [!TIP]
> Odporúčam otvoriť v prehliadači s vývojárskymi nástrojmi (F12) a prepnúť na mobilný režim (napr. iPhone 14 Pro) pre najlepší zážitok.

---

## Technické Detaily

- **VFR výpočty**: NOAA algoritmus pre Holíč LZHL (48.8103°N, 17.1338°E)
- **Dáta**: localStorage (prefix `aircraft-booking-`)
- **Dizajn**: Dark aviation theme, glassmorphism, Inter font
- **Jazyk UI**: Slovenčina
- **PWA ready**: manifest.json pre pridanie na plochu

---

## 🔧 Opravy chýb a vylepšenia (Najnovšie)

V aplikácii boli opravené a otestované nasledovné kritické chyby:

1. **Oprava tlačidiel a prepínania mesiacov/dní v kalendári (`calendar.js`):**
   - Súbor `calendar.js` sa pokúšal aktualizovať neexistujúci kontajner `#calendar-container`. Selektor bol opravený na `#screen-calendar`, čím sa plne spoplatnili tlačidlá navigácie `&lt;` a `&gt;` aj klikanie na jednotlivé dni.
   
2. **Oprava schvaľovacieho procesu v Admin paneli (`admin.js`):**
   - Odstránili sa nesprávne `parseInt` pretypovania pri získavaní ID. ID používateľov (napr. `u1`, `u2`) aj rezervácií (napr. `r17000...`) sú reťazce, pretypovanie vracalo `NaN`, čo spôsobovalo pád schvaľovacieho, zamietacieho a mazacieho workflow.
   - Opravené volania `DataStore.getAircraft()` na správne `DataStore.getFleet()`.
   - Zosúladené mapovanie rezervácie z `userId` / `userName` na korektné `pilotId` / `pilotName` na základe dátového modelu.
   
3. **Podpora pre viacdňové rezervácie a VFR validácia (`vfr.js`):**
   - Pôvodná validácia `isTimeRangeInVfr` neumožňovala viacdňové lety, pretože kontrolovala celý rozsah voči prvému dňu. Nová implementácia kontroluje, či štart spadá do VFR dňa v odletový deň a koniec spadá do VFR dňa v deň príletu, čím podporuje viacdňový prenájom.

4. **Spracovanie stavov neschválených/deaktivovaných používateľov (`auth.js` & `data.js`):**
   - Doplnená migrácia do `DataStore.init()` pre staré databázy v localStorage, aby všetci používatelia dostali korektný prístupový `status`.
   - Pri deactivation v admin paneli sa teraz `approved` správne nastaví na `false`, a systém pri pokuse o login zobrazí prepracované správy ("Váš účet bol deaktivovaný/zamietnutý administrátorom").

5. **Automatické predvyplnenie času z kalendára:**
   - Kliknutie na voľný hodinový slot na timeline v kalendári teraz automaticky predvyplní formulár rezervácie (čas od-do) pre danú hodinu.

