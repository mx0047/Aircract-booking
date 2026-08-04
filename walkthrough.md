# SD Planes – Rezervačný Systém Lietadiel ✈️

## Prehľad

Mobilná webová aplikácia na rezerváciu ultraľahkých lietadiel Špaček SD-1 a SD-2 pre letisko Holíč (LZHL), teraz s kompletným Node.js backendom a podporou pre nasadenie na **Vercel.com**.

---

## Súborová Štruktúra

```
C:\Users\skubamro\.gemini\antigravity\scratch\aircraft-booking\
├── vercel.json                 # Konfigurácia smerovania pre Vercel
├── package.json                # NPM definícia (Express závislosti)
├── index.html                  # Hlavná HTML stránka
├── manifest.json               # PWA manifest
├── api/
│   └── index.js                # Serverless Express API backend (dual storage)
├── css/
│   └── styles.css              # Kompletný CSS (2100+ riadkov)
├── js/
│   ├── app.js                  # Hlavný kontrolér, smerovanie, sync s API
│   ├── data.js                 # Dátový model, prepojenie s backendom & local cache
│   ├── vfr.js                  # VFR sunrise/sunset výpočty (NOAA)
│   ├── auth.js                 # Prihlásenie + registrácia
│   ├── booking.js              # Rezervačná logika + validácia
│   ├── calendar.js             # Kalendár + denný timeline
│   └── admin.js                # Admin panel (schvaľovanie)
└── img/                        # Logá a SVG ikony
```

---

## 🔧 Nové: Online Backend & Vercel Synchronizácia

Aplikácia prešla z čisto offline úložiska na plne zdieľaný online model:

1. **Automatické načítanie (`DataStore.load()`):**
   Pri štarte aplikácie a pri každom prechode na novú obrazovku (napr. preklik na kalendár alebo dashboard) sa na pozadí stiahnu najnovšie rezervácie a stavy účtov od ostatných pilotov.
2. **Background uloženie (`DataStore.saveToServer()`):**
   Všetky zmeny (vytvorenie rezervácie, zrušenie rezervácie, registrácia, schválenie pilota, zmena roly, pridanie lietadla) sa okamžite odosielajú na backend.
3. **Dual Storage Engine (`api/index.js`):**
   - **Vercel KV (Redis):** Ak je na Verceli prepojený Storage, backend používa super-rýchlu serverless Redis databázu.
   - **Záložný lokálny súbor (`db.json`):** Pri lokálnom behu sa dáta ukladajú do lokálneho súboru pre zjednodušenie vývoja bez nutnosti konfigurovať externé databázy.

---

## 🚀 Postup Nasadenia na Vercel

Aplikácia je plne pripravená na nasadenie na jedno kliknutie:

### Krok 1: Nahratie na Vercel
1. Prihláste sa na [Vercel.com](https://vercel.com).
2. Kliknite na **Add New** → **Project**.
3. Importujte Váš GitHub repozitár s aplikáciou (`https://github.com/mx0047/Aircract-booking`).
4. Kliknite na **Deploy**.

### Krok 2: Prepojenie Vercel KV Databázy (Dôležité pre ukladanie)
1. Po úspešnom nasadení prejdite do nastavení projektu vo Verceli.
2. Kliknite na kartu **Storage** v hornom menu.
3. Vyberte **KV** (Redis) a kliknite na **Create**.
4. Po vytvorení prepojte databázu s Vaším projektom (kliknite na **Connect**).
5. Vercel automaticky pridá premenné prostredia (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) do Vášho projektu.
6. Prejdite na kartu **Deployments** a kliknite na **Redeploy** (alebo urobte nový push do GitHubu), aby sa načítali nové nastavenia.

---

## Demo Prihlasovacie Údaje

| Meno | PIN | Rola | Status |
|------|-----|------|--------|
| Igor Špaček | 0000 | Majiteľ (admin) | ✅ Aktívny |
| Martin Smejkal | 9999 | Zástupca (admin) | ✅ Aktívny |
| Martin Otáhal | 1234 | Pilot | ✅ Aktívny |
| Miro Skuba | 3195 | Pilot | ✅ Aktívny |

---

## Technické Detaily

- **Backend**: Node.js, Express 4, Vercel Serverless Functions
- **VFR výpočty**: NOAA algoritmus pre Holíč LZHL (48.8103°N, 17.1338°E)
- **Klient**: Vanilla JS (ES Modules)
- **Synchronizácia**: Fetch API, CORS ready, offline cache v localStorage
