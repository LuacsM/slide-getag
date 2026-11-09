# slide-getag

Apresentação da GETAG (DETIN · SEDUC-AM) à alta gestão: o que entregamos, o que estamos fazendo e o que vamos fazer.
Feita com Reveal.js, GSAP e Three.js, em 16:9.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173/. Navegação: ← → · F tela cheia · S notas do apresentador.

## Estrutura

- `index.html` — conteúdo dos 14 slides
- `src/main.js` — coreografia das animações (GSAP) e gráficos
- `src/scene.js` — fundo de partículas (Three.js)
- `src/style.css` — estilo da versão clara
- `src/data.json` — números usados nos slides (gerado por `npm run data`)
- `assets/` — logos DETIN-GETAG, Governo do Amazonas e SEDUC
- `scripts/shoot.mjs` — verificação visual com Playwright
