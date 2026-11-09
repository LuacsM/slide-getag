// Prepara as imagens da PAPELARIA para a versão clara: recorta margens vazias e redimensiona.
import sharp from 'sharp';
const src = 'PAPELARIA/', out = 'clara/assets/';
const jobs = [
  ['MARCA GOVAM - COLORIDA@300x.png', 'govam-colorida.png', 1800],
  ['MARCA GOVAM BRANCO.png', 'govam-branco.png', 1800],
  ['SEDUC COLORIDA_HORIZONTAL@20x.png', 'seduc-colorida.png', 1200],
  ['SEDUC BRANCA_HORIZONTAL@20x.png', 'seduc-branca.png', 1200],
  ['onda colorida@6x.png', 'onda-colorida.png', 1800],
  ['infos@6x.png', 'infos.png', 1200],
];
for (const [i, o, w] of jobs) {
  const meta = await sharp(src + i).metadata();
  const info = await sharp(src + i).trim({ threshold: 10 }).resize({ width: w, withoutEnlargement: true }).png().toFile(out + o);
  console.log(o, 'alpha:', meta.hasAlpha, '->', info.width + 'x' + info.height);
}
