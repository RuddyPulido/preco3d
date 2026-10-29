// Leitura e escrita de números no jeito brasileiro (vírgula decimal, ponto de milhar).

const casas = (min, max) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });

const dinheiro = casas(2, 2);
const taxa = casas(4, 4);
const fator = casas(0, 6);

export const formatarMoeda = (v) => dinheiro.format(v);
export const formatarValor = (v) => `R$ ${formatarMoeda(v)}`;

// Centavos não bastam para a taxa por minuto: mostra 4 casas
export const formatarTaxa = (v) => `R$ ${taxa.format(v)}`;

// 1,21 / 1 (sem zeros sobrando)
export const formatarFator = (v) => fator.format(v);

// 8000 -> "8.000"; 23.45 -> "23,45"
export const formatarNumero = (v, maxDecimais = 2) => casas(0, maxDecimais).format(v);

// 250 -> "4h 10min"; 60 -> "1h"; 45 -> "45 min"
export function formatarTempo(minutos) {
  const h = Math.floor(minutos / 60);
  const min = minutos % 60;
  if (h === 0) return `${min} min`;
  return min === 0 ? `${h}h` : `${h}h ${min}min`;
}

// Lê o que foi digitado: "1,50", "5.000", "5.000,00" ou "1.5".
// Vazio vira null; texto que não é número vira NaN.
export function lerNumero(texto) {
  let t = String(texto ?? '').replace(/R\$|\s/g, '');
  if (t === '') return null;
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ''); // ponto de milhar: 5.000
  }
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}
