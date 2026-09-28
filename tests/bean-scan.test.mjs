// NIEUW (audit BC-20): naam en branddatum uit etikettekst — pure functies.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();
const NOW = Date.parse('2026-09-28T12:00:00Z');

describe('BC-20: naam uit de etikettekst', () => {
  test('korte eerste regel blijft de naam', () => {
    assert.equal(api.extractBeanNameFromText('7AM Coproca\nWashed · light roast'), '7AM Coproca');
  });
  test('lange geplakte omschrijving → het stuk vóór het eerste scheidingsteken', () => {
    assert.equal(api.extractBeanNameFromText('Ethiopia Guji — washed — light roast. Notes: jasmine, peach, black tea'), 'Ethiopia Guji');
    assert.equal(api.extractBeanNameFromText('Kenya Kiambu AA | Double washed, SL28 & SL34, a juicy and complex cup with blackcurrant'), 'Kenya Kiambu AA');
    assert.equal(api.extractBeanNameFromText('Colombia El Paraiso: thermal shock lychee, very sweet and floral with notes of rose'), 'Colombia El Paraiso');
  });
  test('regels die duidelijk geen naam zijn worden overgeslagen', () => {
    assert.equal(api.extractBeanNameFromText('Roasted on 12-09-2026\nGuatemala Huehuetenango'), 'Guatemala Huehuetenango');
    assert.equal(api.extractBeanNameFromText('Notes: chocolate\nBrazil Cerrado'), 'Brazil Cerrado');
  });
  test('lege tekst → geen naam', () => {
    assert.equal(api.extractBeanNameFromText(''), null);
    assert.equal(api.extractBeanNameFromText('   \n  '), null);
  });
  test('extreem lange regel zonder scheidingstekens → hooguit 6 woorden', () => {
    const n = api.extractBeanNameFromText('This coffee comes from a small family farm high in the mountains of Huila where it is picked by hand');
    assert.ok(n.split(/\s+/).length <= 6 && n.length <= 60, n);
  });
});

describe('BC-20: branddatum uit de etikettekst', () => {
  test('dag-maand-jaar en jaar-maand-dag met een brandwoord ervoor', () => {
    assert.equal(api.extractRoastDateFromText('Roasted on 12-09-2026', NOW), '2026-09-12');
    assert.equal(api.extractRoastDateFromText('Branddatum: 03.09.26', NOW), '2026-09-03');
    assert.equal(api.extractRoastDateFromText('Roast date 2026-09-20', NOW), '2026-09-20');
    assert.equal(api.extractRoastDateFromText('Gebrand op 1/9/2026', NOW), '2026-09-01');
  });
  test('maandnamen in het Nederlands en Engels', () => {
    assert.equal(api.extractRoastDateFromText('Gebrand op 14 september 2026', NOW), '2026-09-14');
    assert.equal(api.extractRoastDateFromText('Roasted: Sep 7, 2026', NOW), '2026-09-07');
  });
  test('een THT/best-before-datum wordt nooit als branddatum gelezen', () => {
    assert.equal(api.extractRoastDateFromText('Best before 12-03-2027', NOW), null);
    assert.equal(api.extractRoastDateFromText('THT 01.02.2027\nWashed', NOW), null);
    assert.equal(api.extractRoastDateFromText('Ethiopia 12-09-2026', NOW), null, 'zonder brandwoord geen gok');
  });
  test('datum in de toekomst, te oud of ongeldig → niets', () => {
    assert.equal(api.extractRoastDateFromText('Roasted on 12-12-2026', NOW), null);
    assert.equal(api.extractRoastDateFromText('Roasted on 12-09-2024', NOW), null);
    assert.equal(api.extractRoastDateFromText('Roasted on 31-02-2026', NOW), null);
  });
  test('"light roast" met een datum verderop is geen branddatum', () => {
    assert.equal(api.extractRoastDateFromText('Light roast — best before 12-09-2026', NOW), null);
  });
});
