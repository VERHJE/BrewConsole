// Zakherkenning (nov 2026): toetsset met 8 echte zakken/webshopschermen die Jelle aanleverde,
// overgetypt zoals je ze zou plakken. Per zak ligt vast wat de herkenning moet opleveren. De OCR-
// meting op de foto's zelf staat in bouwbesluiten_v4.md (die vraagt de Tesseract-taaldata en draait
// daarom niet in deze suite).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();
const P = (t) => api.parseBeanText(t);
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);

const BAGS = {
  lordVoldemor: `Coffee Roasting Man
COLOMBIA
LORD VOLDEMOR, NATURAL
SWEET,CHOCOLATE,COCOA,RED FRUIT,NUTTY,FRUITY,BROWN SUGAR
SCORE 88.5
Quantity 250g, 1KG
Preparation espresso prep, filter prep
Country Colombia
Cupping score 88,5
Region Huila
Process Natural
Preparation espresso, filter
Harvest year 2026
Notes sweet, chocolate, cocoa, red fruit, nutty, fruity
Altitude 1600m
Manufacturer Lord Voldemort
Sort Pink Bourbon`,
  beijaFlor: `Brasil
Sitio Beija Flor #2
Specification
Terms of delivery
espresso prep
13,9 EUR (excl. VAT)
ADD TO CART`,
  amenaza: `COLOMBIA
AMENAZA MENOR SUGARCANE
DECAF
SCORE 87
PAPAYA, ROASTED RED APPLE, CARAMEL, RAISINS, BLACK TEA`,
  elDiviso: `BLOMMERS
COLOMBIA EL DIVISO
World-competition lot by Nestor Lasso. This complex Aji Bourbon features bright herbals and complex spices.
VARIETY AJI BOURBON
TASTE MAGNOLIA, LEMONGRASS, LIME LEAF
ROAST TYPE
AMOUNT 200 Gram
PROCESS EXPERIMENTAL WASHED
ROAST DATE
BEST BEFORE
WWW.BLOMMERS.COFFEE`,
  aromaNativo: `BLOMMERS
COLOMBIA AROMA NATIVO
A double fermented Caturra Mejorado, with lactic bacteria for a bright, floral cup with citrus lift and refined balance.
VARIETY CATURRA MEJORADO
TASTE ALOE VERA, LEMONGRASS, MELON
AMOUNT 200 Gram
PROCESS LACTIC FERMENTED HONEY`,
  pinkBorbon: `Zwarte Roes
SPECIALTY COFFEE
Name PINK BORBON CREATION
Origin COLOMBIA
Processing Semi-Washed
Variety Pink Bourbon
Notes Apple | Tangerine |
Green Tea
Roast level Light
FILTER ROAST`,
  sakami: `Zwarte Roes
SPECIALTY COFFEE
Name SAKAMI BLUE VELVET
Origin KENYA
Processing Natural
Variety Batian
Notes Black Cherry | Raisin | Black Tea
Roast level Light
FILTER ROAST`,
  wonderBeans: `WONDER BEANS
GREED FREE® COFFEE
COLOMBIA
WHOLE BEAN COFFEE*
100% SPECIALTY ARABICA
PERFECT BREW
PROCESS NATURAL DRIED
ELEVATION 1580 - 1680
COÖRDINATES 1.8365° N, 75.8570° W
REGION ACEVEDO -FINCA LAS BRISAS
VARIETY BOURBON AJI
NOTES PRUIM, GEDROOGD & TROPISCH FRUIT
WHERE HAVE YOUR BEANS BEEN?`
};

describe('Zakherkenning: de 8 voorbeeldzakken', () => {
  test('Coffee Roasting Man · Lord Voldemor (webshop)', () => {
    const f = P(BAGS.lordVoldemor);
    assert.equal(f.name, 'Colombia Lord Voldemor');
    assert.equal(f.roaster, 'Coffee Roasting Man');
    assert.equal(f.process, 'natural');
    assert.equal(f.region, 'Huila');
    assert.equal(f.variety, 'Bourbon (roze)');
    assert.equal(f.altitude, 1600);
    assert.equal(f.intendedUse, 'omni', 'espresso én filter genoemd');
    assert.equal(f.bagSizeG, null, '250g en 1KG zijn bestelkeuzes');
    for (const t of ['Chocolade', 'Notig (algemeen)', 'Algeheel zoet', 'Gekarameliseerd']) assert.ok(has(f.tags, t), t);
    assert.deepEqual([...f.unmappedNotes].sort(), ['fruity', 'red fruit']);
  });
  test('Coffee Roasting Man · Sitio Beija Flor #2 (webshop, bijna geen gegevens)', () => {
    const f = P(BAGS.beijaFlor);
    assert.equal(f.name, 'Brasil Sitio Beija Flor #2');
    assert.equal(f.farm, 'Sitio Beija Flor #2');
    assert.equal(f.country, 'Brazilië');
    assert.equal(f.intendedUse, null, '"espresso prep" is een maalkeuze op de shop');
    assert.equal(f.webshop, true);
  });
  test('Coffee Roasting Man · Amenaza Menor Sugarcane Decaf', () => {
    const f = P(BAGS.amenaza);
    assert.equal(f.decaf, true);
    assert.ok(!has(f.tags, 'Rietsuiker'), 'sugarcane is hier de decaf-methode');
    assert.ok(!has(f.tags, 'Geroosterd'), '"roasted red apple" is een appelnotitie');
    for (const t of ['Papaya', 'Appel', 'Gekarameliseerd', 'Rozijn', 'Zwarte thee']) assert.ok(has(f.tags, t), t);
  });
  test('Blommers · El Diviso', () => {
    const f = P(BAGS.elDiviso);
    assert.equal(f.name, 'Colombia El Diviso');
    assert.equal(f.roaster, 'Blommers');
    assert.equal(f.process, 'washed');
    assert.equal(f.experimental, true, 'Experimental Washed');
    assert.equal(f.variety, 'Aji Bourbon');
    assert.equal(f.region, null, 'geen valse regio (Limu) via "lime"');
    assert.equal(f.bagSizeG, 200);
    assert.deepEqual([...f.tags].sort(), ['Bloemig (algemeen)', 'Citroengras', 'Kruidachtig']);
  });
  test('Blommers · Aroma Nativo', () => {
    const f = P(BAGS.aromaNativo);
    assert.equal(f.name, 'Colombia Aroma Nativo');
    assert.equal(f.process, 'honey');
    assert.equal(f.experimental, true, 'lactic / double fermented');
    for (const t of ['Gefermenteerd', 'Yoghurt-achtig', 'Honing']) assert.ok(!has(f.tags, t), `${t} is een proceswoord`);
    assert.deepEqual([...f.tags].sort(), ['Citroengras', 'Meloen']);
    assert.deepEqual([...f.unmappedNotes], ['aloe vera']);
  });
  test('Zwarte Roes · Pink Borbon Creation (semi-washed)', () => {
    const f = P(BAGS.pinkBorbon);
    assert.equal(f.name, 'Pink Borbon Creation');
    assert.equal(f.roaster, 'Zwarte Roes');
    assert.equal(f.process, null, 'semi-washed niet raden');
    assert.equal(f.processAmbiguous, 'semi-washed');
    assert.equal(f.roast, 'light');
    assert.deepEqual([...f.tags].sort(), ['Appel', 'Groene thee', 'Mandarijn']);
  });
  test('Zwarte Roes · Sakami Blue Velvet', () => {
    const f = P(BAGS.sakami);
    assert.equal(f.name, 'Sakami Blue Velvet');
    assert.equal(f.country, 'Kenia');
    assert.equal(f.process, 'natural');
    assert.equal(f.variety, 'Batian');
    assert.deepEqual([...f.tags].sort(), ['Kers', 'Rozijn', 'Zwarte thee']);
  });
  test('Wonder Beans · Finca Las Brisas', () => {
    const f = P(BAGS.wonderBeans);
    assert.equal(f.roaster, 'Wonder Beans');
    assert.equal(f.name, 'Colombia Finca Las Brisas');
    assert.equal(f.region, 'Acevedo');
    assert.equal(f.farm, 'Finca Las Brisas');
    assert.equal(f.variety, 'Aji Bourbon');
    assert.equal(f.process, 'natural');
    assert.equal(f.altitude, 1630, 'bereik 1580–1680');
    assert.deepEqual([...f.tags].sort(), ['Gedroogd fruit (algemeen)', 'Pruim', 'Tropisch fruit (algemeen)']);
  });
});

describe('Zakherkenning: losse regels', () => {
  test('semi-washed wordt nooit washed, gewoon washed wel', () => {
    assert.equal(P('Process: semi washed').process, null);
    assert.equal(P('Process: fully washed').process, 'washed');
  });
  test('gedeeld hoofdwoord wordt uitgeschreven', () => {
    assert.equal(api.expandSharedHeadNouns('gedroogd & tropisch fruit'), 'gedroogd fruit, tropisch fruit');
    assert.ok(api.scanFlavorTagsInText('milk and dark chocolate').has('Melkchocolade'));
    assert.ok(api.scanFlavorTagsInText('milk and dark chocolate').has('Pure chocolade'));
  });
  test('proceswoorden geen smaak, de smaak zelf wel', () => {
    assert.equal(api.scanFlavorTagsInText('double anaerobic fermented natural').size, 0);
    assert.ok(api.scanFlavorTagsInText('notes: fermented, winey').has('Gefermenteerd'));
    assert.ok(api.scanFlavorTagsInText('roasted hazelnut').has('Geroosterd'), 'geroosterde noot blijft geroosterd');
    assert.ok(!api.scanFlavorTagsInText('roasted red apple').has('Geroosterd'));
  });
  test('limoenblad is kruidig, geen limoen', () => {
    const t = api.scanFlavorTagsInText('lime leaf');
    assert.ok(t.has('Kruidachtig') && !t.has('Limoen'));
  });
  test('zakgrootte: één maat telt, meerdere niet', () => {
    assert.equal(api.extractBagSizeFromText('Inhoud 250 g'), 250);
    assert.equal(api.extractBagSizeFromText('250g, 1KG'), null);
  });
  test('hoogtebereik achter een label zonder eenheid', () => {
    assert.equal(api.extractAltitudeFromText('elevation 1580 - 1680'), 1630);
    assert.equal(api.extractAltitudeFromText('altitude 1900-2100 masl'), 2000);
  });
  test('finca zonder label, en een webadres als brander', () => {
    assert.equal(api.extractFarmFromText('REGION HUILA - FINCA EL PARAISO'), 'Finca El Paraiso');
    assert.equal(api.extractRoasterFromText('EL DIVISO\nWWW.BLOMMERS.COFFEE'), 'Blommers');
  });
  test('OCR-ruis wordt geen naam', () => {
    assert.equal(api.extractBeanNameFromText('ons, (a) Colombia\nLord Voldemor Natural'), 'Colombia Lord Voldemor Natural');
    assert.equal(api.extractBeanNameFromText('L & Be 5\nEL DIVISO 3'), 'El Diviso');
  });
  test('cafeïnevrij wordt herkend', () => {
    assert.equal(P('Colombia Swiss Water decaf').decaf, true);
    assert.equal(P('Ethiopia Guji washed').decaf, false);
  });
});

describe('Zakherkenning: voorbewerking van de foto', () => {
  test('grijs met contraststrekking, geen hard zwart-wit meer (gekleurde etiketten bleven anders leeg)', () => {
    const w = 100, h = 1;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w; i++){ const v = 60 + i; data.set([v, v, v, 255], i * 4); } // 60..159
    const img = { data, width: w, height: h };
    const canvas = { width: w, height: h, getContext: () => ({ getImageData: () => img, putImageData(){} }) };
    api.preprocessCanvasForOCR(canvas);
    const vals = new Set(); for (let i = 0; i < w; i++) vals.add(data[i * 4]);
    assert.ok(vals.size > 50, `tussentinten blijven bestaan (${vals.size})`);
    assert.ok(data[0] <= 5 && data[(w - 1) * 4] >= 250, 'het bereik is opgerekt naar zwart–wit');
  });
});
