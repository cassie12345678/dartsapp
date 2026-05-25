# Darts Vision 501

Moderne Next.js web app voor een 501 dartswedstrijd met smartphonecamera, PWA-ondersteuning, scorebord, double-out, bust-detectie, checkout-suggesties, correctie, matchgeschiedenis en spelerstatistieken.

## Installatie

```bash
npm install
npm run dev
```

Open daarna:

```bash
http://localhost:3000
```

Voor camera op een telefoon moet de app via HTTPS draaien, behalve op localhost.

## Wat werkt direct

- Live camera via WebRTC/getUserMedia
- PWA manifest
- Donkere responsive interface
- 501-scorebord
- Beurten van 3 darts
- Wisselen tussen spelers
- Double-out regels
- Bust-detectie
- Checkout-suggesties
- Handmatige correctie
- Matchgeschiedenis in localStorage
- Gemiddelde score, checkoutpercentage, hoogste finish en 180's
- Voice feedback via Web Speech API

## Computer vision

`lib/vision.ts` bevat nu een mock-detectie zodat de complete gameflow direct testbaar is.

Voor echte automatische herkenning moet je de mock vervangen door een OpenCV.js/TensorFlow.js-pipeline:

1. Dartbord detecteren met Hough circle / contourdetectie.
2. Kalibratie opslaan: centrum, radius, rotatie en perspectiefcorrectie.
3. Verschil tussen frames bepalen vóór en na worp.
4. Dartpunt lokaliseren.
5. Pixelpositie omzetten naar ring + sector.
6. Scoreobject teruggeven aan `addDart()`.

## Productie-uitbreiding

Aanbevolen backend:

- Supabase Auth voor login
- PostgreSQL-tabellen: players, matches, turns, darts, stats
- Row Level Security per account
- Realtime match sync voor tablets/scoreboards
