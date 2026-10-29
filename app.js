import { calcular, custoPorMinuto, PADROES, GRAMAS_ROLO } from './calculadora.js';
import {
  formatarValor, formatarMoeda, formatarTaxa, formatarFator, formatarNumero, formatarTempo, lerNumero,
} from './formato.js';

const $ = (seletor) => document.querySelector(seletor);
const $$ = (seletor) => document.querySelectorAll(seletor);

// ---- Guardado no celular. Em aba anônima pode falhar: segue sem guardar ----

const CHAVE_AJUSTES = 'preco3d.ajustes';
const CHAVE_LUCRO = 'preco3d.lucro';
const CHAVE_CONTA_ABERTA = 'preco3d.contaAberta';

function ler(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave));
  } catch {
    return null;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento: vale só até fechar
  }
}

// ---- Ajustes ----

const REGRAS = {
  precoRolo: (v) => v > 0 || 'O preço do rolo precisa ser maior que zero.',
  precoImpressora: (v) => v >= 0 || 'O preço da impressora não pode ser negativo.',
  vidaUtilHoras: (v) => v > 0 || 'A vida útil precisa ser maior que zero.',
  custoClicker: (v) => v >= 0 || 'O custo do clicker não pode ser negativo.',
  custoCorrentinha: (v) => v >= 0 || 'O custo da correntinha não pode ser negativo.',
};

function validarAjuste(nome, texto) {
  const valor = lerNumero(texto);
  if (valor === null) return { erro: 'Preencha este campo.' };
  if (Number.isNaN(valor)) return { erro: 'Digite só números, como 1,50.' };
  const regra = REGRAS[nome](valor);
  return regra === true ? { valor } : { erro: regra };
}

function carregarAjustes() {
  const guardados = ler(CHAVE_AJUSTES) ?? {};
  const ajustes = { ...PADROES };
  for (const nome of Object.keys(PADROES)) {
    const v = guardados[nome];
    if (typeof v === 'number' && REGRAS[nome](v) === true) ajustes[nome] = v;
  }
  return ajustes;
}

let ajustes = carregarAjustes();

const formatarAjuste = (campo, v) => (campo.dataset.casas === '2' ? formatarMoeda(v) : formatarNumero(v));

function preencherAjustes() {
  for (const campo of $$('[data-ajuste]')) {
    campo.value = formatarAjuste(campo, ajustes[campo.dataset.ajuste]);
    mostrarErroAjuste(campo, '');
  }
  atualizarCustoUso();
}

function mostrarErroAjuste(campo, erro) {
  const bloco = campo.closest('.campo');
  bloco.querySelector('.erro').textContent = erro;
  bloco.querySelector('.entrada').classList.toggle('com-erro', erro !== '');
}

function atualizarCustoUso() {
  const porMinuto = custoPorMinuto(ajustes.precoImpressora, ajustes.vidaUtilHoras);
  const porHora = ajustes.precoImpressora / ajustes.vidaUtilHoras;
  $('#aj-custo-uso').textContent =
    `Custo de uso: ${formatarTaxa(porMinuto)} por minuto (${formatarValor(porHora)} por hora)`;
}

for (const campo of $$('[data-ajuste]')) {
  campo.addEventListener('input', () => {
    const { valor, erro } = validarAjuste(campo.dataset.ajuste, campo.value);
    // Na primeira digitação o aviso de erro espera ela sair do campo
    if (erro && !campo.dataset.tocado) return;
    mostrarErroAjuste(campo, erro ?? '');
    if (erro) return;
    ajustes = { ...ajustes, [campo.dataset.ajuste]: valor };
    gravar(CHAVE_AJUSTES, ajustes);
    atualizarCustoUso();
  });
  campo.addEventListener('blur', () => {
    campo.dataset.tocado = 'sim';
    const { valor, erro } = validarAjuste(campo.dataset.ajuste, campo.value);
    mostrarErroAjuste(campo, erro ?? '');
    if (erro) return;
    ajustes = { ...ajustes, [campo.dataset.ajuste]: valor };
    gravar(CHAVE_AJUSTES, ajustes);
    campo.value = formatarAjuste(campo, valor);
    atualizarCustoUso();
  });
}

$('#restaurar').addEventListener('click', () => {
  if (!confirm('Voltar todos os ajustes para os valores de fábrica?')) return;
  ajustes = { ...PADROES };
  gravar(CHAVE_AJUSTES, ajustes);
  for (const campo of $$('[data-ajuste]')) delete campo.dataset.tocado;
  preencherAjustes();
});

// ---- Calculadora ----

const tocados = new Set();

function lerEntradas() {
  const erros = {};

  const gramas = lerNumero($('#peso').value);
  if (gramas === null) erros.peso = '';
  else if (Number.isNaN(gramas)) erros.peso = 'Digite só números, como 23,5.';
  else if (gramas <= 0) erros.peso = 'O peso precisa ser maior que zero.';

  const horas = lerNumero($('#horas').value);
  const min = lerNumero($('#minutos').value);
  let minutos = null;
  if (horas === null && min === null) {
    erros.tempo = '';
  } else if ([horas, min].some((v) => v !== null && !(Number.isInteger(v) && v >= 0))) {
    erros.tempo = 'Use números inteiros, sem vírgula.';
  } else {
    minutos = (horas ?? 0) * 60 + (min ?? 0);
    if (minutos <= 0) erros.tempo = 'O tempo precisa ser maior que zero.';
  }

  const margem = lerNumero($('#lucro').value);
  if (margem === null) erros.lucro = 'Escolha o lucro (pode ser 0).';
  else if (Number.isNaN(margem)) erros.lucro = 'Digite só números.';
  else if (margem < 0) erros.lucro = 'Lucro negativo é vender com prejuízo!';

  const cores = Number($('input[name="cores"]:checked').value);

  const acessorios = [];
  if ($('#usa-clicker').checked) acessorios.push({ nome: 'Clicker', custo: ajustes.custoClicker });
  if ($('#usa-correntinha').checked) acessorios.push({ nome: 'Correntinha', custo: ajustes.custoCorrentinha });

  return { gramas, minutos, cores, margem, acessorios, erros };
}

function mostrarErro(nome, erro) {
  const visivel = tocados.has(nome) ? erro ?? '' : '';
  $(`#${nome}-erro`).textContent = visivel;
  const entradas = nome === 'tempo' ? ['#horas', '#minutos'] : [`#${nome}`];
  for (const id of entradas) $(id).closest('.entrada').classList.toggle('com-erro', visivel !== '');
}

let precoAtual = null;

function atualizar() {
  $('#clicker-custo').textContent = `+ ${formatarValor(ajustes.custoClicker)}`;
  $('#correntinha-custo').textContent = `+ ${formatarValor(ajustes.custoCorrentinha)}`;

  const entradas = lerEntradas();
  const { gramas, minutos, cores, margem, acessorios, erros } = entradas;
  for (const nome of ['peso', 'tempo', 'lucro']) mostrarErro(nome, erros[nome]);

  $('#tempo-dica').textContent = minutos > 0 ? `Total: ${formatarNumero(minutos)} minutos` : '';

  const completo = Object.keys(erros).length === 0;
  $('#resultado-vazio').hidden = completo;
  $('#resultado-conta').hidden = !completo;
  $('#resultado-vazio').textContent = erros.peso || erros.tempo || erros.lucro
    ? 'Corrija os campos marcados para ver o preço.'
    : 'Preencha o peso e o tempo para ver o preço.';

  if (!completo) {
    precoAtual = null;
    atualizarBarraPreco();
    return;
  }

  const r = calcular({
    precoRolo: ajustes.precoRolo,
    gramas,
    cores,
    minutos,
    precoImpressora: ajustes.precoImpressora,
    vidaUtilHoras: ajustes.vidaUtilHoras,
    acessorios,
    margem,
  });

  precoAtual = { ...entradas, r };
  $('#preco').textContent = formatarValor(r.precoVenda);
  $('#barra-preco-valor').textContent = formatarValor(r.precoVenda);
  desenharBarra(r);
  escreverPassos(entradas, r);
  atualizarBarraPreco();
}

function desenharBarra(r) {
  // Ordem fixa das partes (as cores foram validadas nessa sequência)
  const partes = [
    { nome: 'Filamento', valor: r.filamentoAjustado, cor: '--s-filamento' },
    { nome: 'Acessórios', valor: r.custoAcessorios, cor: '--s-acessorios' },
    { nome: 'Impressora', valor: r.custoImpressora, cor: '--s-impressora' },
    { nome: 'Lucro', valor: r.lucro, cor: '--s-lucro', lucro: true },
  ].filter((p) => p.valor > 0);

  const barra = $('#barra');
  const legenda = $('#legenda');
  barra.replaceChildren();
  legenda.replaceChildren();

  const fatias = porcentagens(partes.map((p) => p.valor), r.precoVenda);
  for (const [i, parte] of partes.entries()) {
    const segmento = document.createElement('i');
    segmento.style.flex = `${parte.valor} 0 0`;
    segmento.style.background = `var(${parte.cor})`;
    segmento.title = `${parte.nome}: ${formatarValor(parte.valor)} (${fatias[i]}%)`;
    barra.append(segmento);
  }

  const itens = partes.map((parte, i) => itemLegenda(
    parte.lucro ? 'Seu lucro' : parte.nome, fatias[i], parte.valor, parte.cor, parte.lucro ? 'e-lucro' : ''));

  // Custo total fecha a soma dos custos, logo antes do lucro
  const fatiaCusto = partes.reduce((soma, p, i) => (p.lucro ? soma : soma + fatias[i]), 0);
  const posicaoLucro = partes.findIndex((p) => p.lucro);
  itens.splice(posicaoLucro < 0 ? itens.length : posicaoLucro, 0,
    itemLegenda('Custo total', fatiaCusto, r.custoTotal, null, 'e-total'));
  legenda.append(...itens);

  barra.setAttribute('aria-label',
    `Para onde vai o dinheiro: ${partes.map((p) => `${p.nome} ${formatarValor(p.valor)}`).join(', ')}`);
}

function itemLegenda(nome, fatia, valor, cor, classe) {
  const item = document.createElement('li');
  if (classe) item.className = classe;
  item.innerHTML = '<span class="amostra"></span><span class="nome"></span><span class="parte"></span><span class="valor"></span>';
  if (cor) item.querySelector('.amostra').style.background = `var(${cor})`;
  item.querySelector('.nome').textContent = nome;
  item.querySelector('.parte').textContent = `${fatia}%`;
  item.querySelector('.valor').textContent = formatarValor(valor);
  return item;
}

// Porcentagens inteiras que somam 100: quem perdeu mais no arredondamento ganha o ponto que falta
function porcentagens(valores, total) {
  if (!(total > 0)) return valores.map(() => 0);
  const exatas = valores.map((v) => (v / total) * 100);
  const inteiras = exatas.map(Math.floor);
  let falta = 100 - inteiras.reduce((soma, v) => soma + v, 0);
  const ordem = exatas.map((v, i) => [v - inteiras[i], i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of ordem) {
    if (falta <= 0) break;
    inteiras[i] += 1;
    falta -= 1;
  }
  return inteiras;
}

function escreverPassos({ gramas, minutos, cores, margem, acessorios }, r) {
  const linhas = [
    ['Filamento', `${formatarNumero(gramas)} g de um rolo de ${formatarNumero(GRAMAS_ROLO)} g que custa ${formatarValor(ajustes.precoRolo)}`,
      formatarValor(r.custoFilamento)],
    ['Ajuste pelas cores', cores === 1 ? '1 cor' : `${cores} cores`, `× ${formatarFator(r.fatorCores)}`],
    ['Ajuste pelo tempo', `${formatarTempo(minutos)} (a cada 2 h a mais, × 1,1)`, `× ${formatarFator(r.fatorTempo)}`],
    ['Filamento com ajustes', '', formatarValor(r.filamentoAjustado), 'subtotal'],
    ['Uso da impressora', `${formatarNumero(minutos)} min × ${formatarTaxa(r.custoMinutoImpressora)} por minuto`,
      `+ ${formatarValor(r.custoImpressora)}`],
    ...acessorios.map((a) => [a.nome, '', `+ ${formatarValor(a.custo)}`]),
    ['Custo total', '', formatarValor(r.custoTotal), 'subtotal'],
    [`Lucro (${formatarNumero(margem)}%)`, `${formatarNumero(margem)}% de ${formatarValor(r.custoTotal)}`,
      `+ ${formatarValor(r.lucro)}`],
    ['Preço de venda', '', formatarValor(r.precoVenda), 'final'],
  ];

  const lista = $('#passos');
  lista.replaceChildren();
  for (const [rotulo, detalhe, valor, classe] of linhas) {
    const linha = document.createElement('div');
    linha.className = `passo ${classe ?? ''}`;
    const dt = document.createElement('dt');
    dt.textContent = rotulo;
    if (detalhe) {
      const small = document.createElement('small');
      small.textContent = detalhe;
      dt.append(small);
    }
    const dd = document.createElement('dd');
    dd.textContent = valor;
    linha.append(dt, dd);
    lista.append(linha);
  }
}

// ---- Barra do preço: aparece quando o resultado está fora da tela ----

let resultadoNaTela = false;

function atualizarBarraPreco() {
  const naCalculadora = !$('#tela-calculadora').hidden;
  $('#barra-preco').hidden = !(precoAtual && naCalculadora && !resultadoNaTela);
}

new IntersectionObserver(([entrada]) => {
  resultadoNaTela = entrada.isIntersecting;
  atualizarBarraPreco();
}, { threshold: 0.15 }).observe($('#resultado'));

$('#barra-preco').addEventListener('click', () => {
  $('#resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---- Eventos da calculadora ----

for (const id of ['#peso', '#horas', '#minutos', '#lucro']) {
  $(id).addEventListener('input', atualizar);
}
$('#peso').addEventListener('blur', () => { tocados.add('peso'); atualizar(); });
for (const id of ['#horas', '#minutos']) {
  $(id).addEventListener('blur', () => { tocados.add('tempo'); atualizar(); });
}
tocados.add('lucro');

for (const opcao of $$('input[name="cores"], #usa-clicker, #usa-correntinha')) {
  opcao.addEventListener('change', atualizar);
}

// Lucro: o número e a régua andam juntos
$('#lucro-faixa').addEventListener('input', () => {
  $('#lucro').value = $('#lucro-faixa').value;
  atualizar();
});
$('#lucro').addEventListener('input', () => {
  const v = lerNumero($('#lucro').value);
  if (v !== null && !Number.isNaN(v)) $('#lucro-faixa').value = String(v);
});
$('#lucro').addEventListener('change', () => gravar(CHAVE_LUCRO, $('#lucro').value));
$('#lucro-faixa').addEventListener('change', () => gravar(CHAVE_LUCRO, $('#lucro').value));

const lucroGuardado = ler(CHAVE_LUCRO);
if (typeof lucroGuardado === 'string' && lucroGuardado !== '') {
  $('#lucro').value = lucroGuardado;
  $('#lucro-faixa').value = String(lerNumero(lucroGuardado) || 0);
}

const conta = $('.conta');
conta.open = ler(CHAVE_CONTA_ABERTA) === true;
conta.addEventListener('toggle', () => gravar(CHAVE_CONTA_ABERTA, conta.open));

// ---- Compartilhar ----

$('#compartilhar').addEventListener('click', async () => {
  if (!precoAtual) return;
  const { gramas, minutos, cores, acessorios, r } = precoAtual;
  const extras = acessorios.length ? `, com ${acessorios.map((a) => a.nome.toLowerCase()).join(' e ')}` : '';
  const texto = [
    'Orçamento de impressão 3D',
    `Peça de ${formatarNumero(gramas)} g, ${cores === 1 ? '1 cor' : `${cores} cores`}, ${formatarTempo(minutos)} de impressão${extras}`,
    `Preço: ${formatarValor(r.precoVenda)}`,
  ].join('\n');

  const aviso = $('#compartilhar-aviso');
  aviso.textContent = '';
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Orçamento 3D', text: texto });
    } catch {
      // cancelou: nada a fazer
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(texto);
    aviso.textContent = 'Orçamento copiado. É só colar no WhatsApp.';
  } catch {
    aviso.textContent = 'Não deu para copiar neste navegador.';
  }
});

// ---- Navegação entre as telas ----

let veioDaCalculadora = false;

function mostrarTela() {
  const emAjustes = location.hash === '#ajustes';
  $('#tela-calculadora').hidden = emAjustes;
  $('#tela-ajustes').hidden = !emAjustes;
  for (const e of $$('[data-so-ajustes]')) e.hidden = !emAjustes;
  for (const e of $$('[data-so-calculadora]')) e.hidden = emAjustes;
  if (emAjustes) preencherAjustes();
  else atualizar();
  window.scrollTo(0, 0);
}

$('.topo-botao').addEventListener('click', () => { veioDaCalculadora = true; });
$('.topo-voltar').addEventListener('click', (evento) => {
  evento.preventDefault();
  if (veioDaCalculadora) {
    veioDaCalculadora = false;
    history.back();
  } else {
    history.replaceState(null, '', location.pathname);
    mostrarTela();
  }
});
window.addEventListener('hashchange', mostrarTela);
mostrarTela();

// ---- Funcionar sem internet ----

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
