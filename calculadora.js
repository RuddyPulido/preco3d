// Calculadora de preço de venda para impressões 3D.
// Custo = filamento usado x ajuste de cores x ajuste de tempo
//         + uso da impressora (custo por minuto x tempo)
//         + acessórios (clicker, correntinha)
// Preço = custo + lucro (percentual sobre o custo)
//
// As contas usam frações exatas (BigInt) e arredondam nos mesmos pontos
// que a versão ABAP (ZPRECO_IMPRESSAO_3D), para os centavos baterem com o SAP.

export const PADROES = Object.freeze({
  precoRolo: 100,
  precoImpressora: 5000,
  vidaUtilHoras: 8000,
  custoClicker: 1,
  custoCorrentinha: 1,
});

export const GRAMAS_ROLO = 1000;
const MINUTOS_FAIXA = 120;
const ACRESCIMO_COR = '0.1';
const FATOR_POR_FAIXA = '1.1';

// ---- Frações exatas: { n: numerador, d: denominador } ----

function fracao(valor) {
  const texto = String(valor);
  if (!/^-?\d+(\.\d+)?$/.test(texto)) throw new TypeError(`Número inválido: ${texto}`);
  const [inteiro, decimais = ''] = texto.split('.');
  return { n: BigInt(inteiro + decimais), d: 10n ** BigInt(decimais.length) };
}

const vezes = (a, b) => ({ n: a.n * b.n, d: a.d * b.d });
const dividido = (a, b) => ({ n: a.n * b.d, d: a.d * b.n });
const mais = (a, b) => ({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
const numero = (a) => Number(a.n) / Number(a.d);

// Arredondamento comercial (0,5 vai para cima), como o ABAP faz ao gravar num campo P
function arredondar(a, casas) {
  const escala = 10n ** BigInt(casas);
  const negativo = (a.n < 0n) !== (a.d < 0n);
  const n = a.n < 0n ? -a.n : a.n;
  const d = a.d < 0n ? -a.d : a.d;
  const q = (n * escala * 2n + d) / (2n * d);
  return { n: negativo ? -q : q, d: escala };
}

const valor = (a) => arredondar(a, 2);

// ---- Regras ----

function fatorCoresExato(cores) {
  // 1 cor = 1,0 e cada cor a mais soma 0,1
  return arredondar(mais(fracao(1), vezes(fracao(cores - 1), fracao(ACRESCIMO_COR))), 6);
}

function fatorTempoExato(minutos) {
  // Até 120 min fica 1,0; cada faixa de 120 min a mais multiplica por 1,1
  const faixasExtras = Math.floor((minutos - 1) / MINUTOS_FAIXA);
  let fator = fracao(1);
  for (let i = 0; i < faixasExtras; i++) {
    fator = arredondar(vezes(fator, fracao(FATOR_POR_FAIXA)), 6);
  }
  return fator;
}

function custoPorMinutoExato(precoImpressora, vidaUtilHoras) {
  if (!(vidaUtilHoras > 0)) return fracao(0);
  return arredondar(dividido(valor(fracao(precoImpressora)), vezes(fracao(vidaUtilHoras), fracao(60))), 8);
}

export const fatorCores = (cores) => numero(fatorCoresExato(cores));
export const fatorTempo = (minutos) => numero(fatorTempoExato(minutos));
export const custoPorMinuto = (precoImpressora, vidaUtilHoras) =>
  numero(custoPorMinutoExato(precoImpressora, vidaUtilHoras));

export function calcular({
  precoRolo = PADROES.precoRolo,
  gramas,
  cores,
  minutos,
  precoImpressora = PADROES.precoImpressora,
  vidaUtilHoras = PADROES.vidaUtilHoras,
  acessorios = [],
  margem,
}) {
  const fCores = fatorCoresExato(cores);
  const fTempo = fatorTempoExato(minutos);
  const filamento = dividido(vezes(fracao(gramas), valor(fracao(precoRolo))), fracao(GRAMAS_ROLO));
  const filamentoAjustado = valor(vezes(vezes(filamento, fCores), fTempo));

  // Uso da impressora: o preço dela dividido pelos minutos de vida útil.
  // Multiplica antes de dividir para não arredondar a taxa por minuto.
  const custoImpressora = vidaUtilHoras > 0
    ? valor(dividido(vezes(fracao(minutos), valor(fracao(precoImpressora))),
                     vezes(fracao(vidaUtilHoras), fracao(60))))
    : fracao(0);

  const custoAcessorios = acessorios.reduce(
    (soma, acessorio) => valor(mais(soma, valor(fracao(acessorio.custo)))), fracao(0));

  const custoTotal = valor(mais(mais(filamentoAjustado, custoImpressora), custoAcessorios));
  const lucro = valor(dividido(vezes(custoTotal, fracao(margem)), fracao(100)));

  return {
    custoFilamento: numero(valor(filamento)),
    fatorCores: numero(fCores),
    fatorTempo: numero(fTempo),
    filamentoAjustado: numero(filamentoAjustado),
    custoMinutoImpressora: numero(custoPorMinutoExato(precoImpressora, vidaUtilHoras)),
    custoImpressora: numero(custoImpressora),
    custoAcessorios: numero(custoAcessorios),
    custoTotal: numero(custoTotal),
    lucro: numero(lucro),
    precoVenda: numero(valor(mais(custoTotal, lucro))),
  };
}
