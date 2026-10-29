// Os mesmos casos da classe de teste do ABAP, com os valores calculados à mão.
// Impressora padrão: R$ 5000 / (8000 h x 60) = R$ 0,0104166... por minuto
// Rodar: npm test (Node 18 ou mais novo)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcular, fatorCores, fatorTempo, custoPorMinuto } from './calculadora.js';
import { formatarValor, formatarTaxa, formatarFator, formatarTempo, lerNumero } from './formato.js';

test('uma cor até 120 min', () => {
  // Filamento: 50 g de R$ 100/1000 g = R$ 5,00; sem ajustes
  // Impressora: 120 min x 5000 / 480000 = R$ 1,25
  // Custo 6,25; lucro 50% = 3,125 -> 3,13; preço = 9,38
  const r = calcular({ gramas: 50, cores: 1, minutos: 120, margem: 50 });
  assert.equal(r.custoFilamento, 5.00);
  assert.equal(r.custoImpressora, 1.25);
  assert.equal(r.custoTotal, 6.25);
  assert.equal(r.lucro, 3.13);
  assert.equal(r.precoVenda, 9.38);
});

test('fator de cores', () => {
  assert.equal(fatorCores(1), 1.0);
  assert.equal(fatorCores(2), 1.1);
  assert.equal(fatorCores(3), 1.2);
  assert.equal(fatorCores(4), 1.3);
});

test('faixas de tempo', () => {
  assert.equal(fatorTempo(1), 1);
  assert.equal(fatorTempo(120), 1);
  assert.equal(fatorTempo(121), 1.1);
  assert.equal(fatorTempo(240), 1.1);
  assert.equal(fatorTempo(241), 1.21);
  assert.equal(fatorTempo(360), 1.21);
  assert.equal(fatorTempo(361), 1.331);
});

test('exemplo completo', () => {
  // Filamento: 200 g = R$ 20,00; x 1,2 (3 cores) = 24,00; x 1,21 (250 min) = 29,04
  // Impressora: 250 x 5000 / 480000 = 2,6041... -> 2,60
  // Custo 31,64; lucro 40% = 12,656 -> 12,66; preço = 44,30
  const r = calcular({ gramas: 200, cores: 3, minutos: 250, margem: 40 });
  assert.equal(r.custoFilamento, 20.00);
  assert.equal(r.filamentoAjustado, 29.04);
  assert.equal(r.custoImpressora, 2.60);
  assert.equal(r.custoTotal, 31.64);
  assert.equal(r.lucro, 12.66);
  assert.equal(r.precoVenda, 44.30);
});

test('sem lucro', () => {
  // Filamento: 33 g = R$ 3,30; x 1,1 (2 cores) = 3,63
  // Impressora: 90 x 5000 / 480000 = 0,9375 -> 0,94
  // Custo 4,57; 0% de lucro: preço = custo
  const r = calcular({ gramas: 33, cores: 2, minutos: 90, margem: 0 });
  assert.equal(r.custoTotal, 4.57);
  assert.equal(r.lucro, 0);
  assert.equal(r.precoVenda, 4.57);
});

test('preço do rolo editável', () => {
  // Rolo de R$ 150,00: 200 g = R$ 30,00; sem ajustes
  // Impressora: 60 x 5000 / 480000 = 0,625 -> 0,63; 0% de lucro
  const r = calcular({ precoRolo: 150, gramas: 200, cores: 1, minutos: 60, margem: 0 });
  assert.equal(r.custoFilamento, 30.00);
  assert.equal(r.precoVenda, 30.63);
});

test('uso da impressora', () => {
  // Padrão: 5000 / 480000 = 0,01041666 por minuto; 480 min (8 h) = R$ 5,00
  assert.equal(custoPorMinuto(5000, 8000), 0.01041667);
  let r = calcular({ gramas: 10, cores: 1, minutos: 480, margem: 0 });
  assert.equal(r.custoImpressora, 5.00);
  // Outra impressora: R$ 3000 / (6000 h x 60) x 120 min = R$ 1,00
  r = calcular({ gramas: 10, cores: 1, minutos: 120, margem: 0, precoImpressora: 3000, vidaUtilHoras: 6000 });
  assert.equal(r.custoImpressora, 1.00);
  // Filamento 10 g = 1,00 + impressora 1,00
  assert.equal(r.custoTotal, 2.00);
});

test('impressora sem vida útil', () => {
  // Vida útil zero não pode dividir por zero: impressora não entra no custo
  const r = calcular({ gramas: 50, cores: 1, minutos: 60, margem: 0, vidaUtilHoras: 0 });
  assert.equal(r.custoImpressora, 0);
  assert.equal(r.custoTotal, 5.00);
});

test('com clicker e correntinha', () => {
  // Filamento 5,00 + impressora 1,25 + clicker 1,00 + correntinha 1,00 = 8,25
  // lucro 50% = 4,125 -> 4,13; preço = 12,38
  const r = calcular({
    gramas: 50,
    cores: 1,
    minutos: 120,
    acessorios: [{ nome: 'Clicker', custo: 1 }, { nome: 'Correntinha', custo: 1 }],
    margem: 50,
  });
  assert.equal(r.filamentoAjustado, 5.00);
  assert.equal(r.custoAcessorios, 2.00);
  assert.equal(r.custoTotal, 8.25);
  assert.equal(r.lucro, 4.13);
  assert.equal(r.precoVenda, 12.38);
});

test('exemplo completo com clicker', () => {
  // Filamento 29,04 + impressora 2,60 + clicker 1,50 = 33,14
  // lucro 40% = 13,256 -> 13,26; preço = 33,14 + 13,26 = 46,40
  const r = calcular({
    gramas: 200,
    cores: 3,
    minutos: 250,
    acessorios: [{ nome: 'Clicker', custo: 1.5 }],
    margem: 40,
  });
  assert.equal(r.filamentoAjustado, 29.04);
  assert.equal(r.custoTotal, 33.14);
  assert.equal(r.lucro, 13.26);
  assert.equal(r.precoVenda, 46.40);
});

test('formatação', () => {
  assert.equal(formatarValor(40.66), 'R$ 40,66');
  assert.equal(formatarValor(5), 'R$ 5,00');
  assert.equal(formatarValor(5000), 'R$ 5.000,00');
  assert.equal(formatarFator(1.21), '1,21');
  assert.equal(formatarFator(1), '1');
  assert.equal(formatarTaxa(0.01041667), 'R$ 0,0104');
  assert.equal(formatarTempo(250), '4h 10min');
  assert.equal(formatarTempo(60), '1h');
  assert.equal(formatarTempo(45), '45 min');
});

// Só existe na versão web: o celular manda vírgula ou ponto
test('leitura do que foi digitado', () => {
  assert.equal(lerNumero('1,50'), 1.5);
  assert.equal(lerNumero('1.5'), 1.5);
  assert.equal(lerNumero('100'), 100);
  assert.equal(lerNumero('5.000'), 5000);
  assert.equal(lerNumero('5.000,00'), 5000);
  assert.equal(lerNumero('R$ 1,00'), 1);
  assert.equal(lerNumero('-1'), -1);
  assert.equal(lerNumero(''), null);
  assert.ok(Number.isNaN(lerNumero('abc')));
});
