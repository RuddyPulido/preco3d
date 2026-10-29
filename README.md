# Preço 3D

Calculadora de preço de venda para peças impressas em 3D. É a versão para celular
do report ABAP `ZPRECO_IMPRESSAO_3D` (transação `ZPRECO3D`), com a mesma conta e
os mesmos testes.

## A conta

```
Filamento   = gramas ÷ 1000 × preço do rolo
            × ajuste de cores  (1 cor ×1 · 2 cores ×1,1 · 3 cores ×1,2 · 4 cores ×1,3)
            × ajuste de tempo  (até 120 min ×1; cada 120 min a mais, ×1,1 de novo)
Impressora  = minutos × preço da impressora ÷ (vida útil em horas × 60)
Acessórios  = clicker + correntinha (os que estiverem ligados)
Custo total = filamento + impressora + acessórios
Lucro       = custo total × % de lucro
Preço       = custo total + lucro
```

Os valores de fábrica (rolo R$ 100, impressora R$ 5.000, vida útil 8.000 h,
clicker e correntinha R$ 1) mudam na tela **Ajustes** (a engrenagem) e ficam
guardados no celular.

As contas usam frações exatas e arredondam nos mesmos pontos do ABAP, então os
centavos batem com o SAP.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `index.html` | As duas telas: Calculadora e Ajustes |
| `estilo.css` | Visual (claro e escuro, segue o celular) |
| `app.js` | Liga a tela à conta, guarda os ajustes, compartilha |
| `calculadora.js` | A conta, sem nada de tela |
| `formato.js` | Ler e escrever números do jeito brasileiro |
| `calculadora.test.js` | Os testes (os 11 do ABAP e mais um de leitura de números) |
| `sw.js` | Guarda os arquivos para abrir sem internet |
| `manifest.webmanifest`, `icones/` | Nome e ícone quando instalado no celular |

## Testar no computador

```bash
python3 -m http.server 8000
```

Abra http://localhost:8000. Para os testes automáticos (Node 18 ou mais novo):

```bash
npm test
```

## Publicar no GitHub Pages (grátis)

1. Crie um repositório **público** chamado `preco3d` no GitHub.
2. Dentro desta pasta:

   ```bash
   git init
   git add .
   git commit -m "Calculadora de preço 3D"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/preco3d.git
   git push -u origin main
   ```

   Com o GitHub CLI, os passos 1 e 2 viram um só: `gh repo create preco3d --public --source=. --push`

3. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   escolha `main` e `/ (root)` e clique em **Save**.
4. Em um ou dois minutos o app está em `https://SEU-USUARIO.github.io/preco3d/`.

## Instalar no celular

- **iPhone:** abra o endereço no Safari → botão Compartilhar → **Adicionar à Tela de Início**.
- **Android:** abra no Chrome → menu ⋮ → **Instalar app** (ou Adicionar à tela inicial).

Depois de instalado ele abre em tela cheia e funciona sem internet.

## Atualizar

Mude os arquivos, faça `git commit` e `git push`. O celular pega a versão nova na
próxima vez que abrir o app com internet.

Se criar ou apagar algum arquivo, atualize a lista `ARQUIVOS` em `sw.js` e troque
o número em `CACHE` (por exemplo `preco3d-v2`), para o app guardar a lista nova.
