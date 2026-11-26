#!/usr/bin/env node
/* Soru şekillerinin mat kil gölge resimlerini üretir (bir kez çalıştırılır, çıktı depoya girer).
 *
 *   node tools/kil-sekiller.js <three klasörü>
 *
 * <three klasörü>: three@0.147.0 paketinin açıldığı yer (build/three.min.js ve
 * examples/js/loaders/SVGLoader.js gerekir). Örnek: npm pack three@0.147.0 && tar xzf three-0.147.0.tgz
 *
 * Her şekil three.js ile yuvarlak kenarlı kil parçası olarak çıkarılır, mat malzeme ve sol üstten
 * gelen ışıkla tepeden çekilir. Sonuç renksiz bir gölge haritasıdır: düz yüzey %50 gri, kenarlar
 * koyu ya da açık. Oyunda şeklin kendi rengi üstüne "hard-light" karışımıyla konur; böylece tek
 * resim her renk, çizgili ve içi boş dolguyla çalışır.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const threeDir = process.argv[2];
if (!threeDir) { console.error('Kullanım: node tools/kil-sekiller.js <three@0.147.0 klasörü>'); process.exit(1); }
const three = fs.readFileSync(path.join(threeDir, 'build/three.min.js'), 'utf8');
const loader = fs.readFileSync(path.join(threeDir, 'examples/js/loaders/SVGLoader.js'), 'utf8');

global.window = undefined;
const { Shapes } = require(path.join(root, 'js/shapes.js'));
// Köşe yuvarlaması kenar yuvarlamasından küçükse kil kendi içine kıvrılır; köşeleri SVG'deki kırpma zaten yuvarlar.
const list = Object.keys(Shapes.SHAPES).map((id) => ({ id, d: Shapes.SHAPES[id].d.replace(/ rx="[\d.]+"/, '') }));
list.push({ id: 'hucre', d: '<rect x="-50" y="-50" width="100" height="100"/>' });   // kareli şekil hücresi

// İnce şekillerde kenar yuvarlaması küçük tutulur, yoksa kil kendi içine taşar.
const BEVEL = { flag: 3.8, moon: 5, ell: 8, plus: 8, arrow: 8, pac: 10, star: 6.5, triangle: 9, diamond: 8, drop: 10, semi: 10, hucre: 12 };

const page = `<!DOCTYPE html><meta charset="utf-8"><body><pre id="out"></pre>
<script>${three}</script><script>${loader}</script><script>
const LIST = ${JSON.stringify(list)}, BEVEL = ${JSON.stringify(BEVEL)}, PX = 240;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(PX, PX); renderer.setClearColor(0x000000, 0);
renderer.outputEncoding = THREE.sRGBEncoding;

// Kil dokusu: ince taneli gürültü ve parmak izi gibi birkaç yumuşak leke.
function noiseTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), img = g.createImageData(512, 512);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (rnd() - 0.5) * 70; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.filter = 'blur(1.2px)'; g.drawImage(c, 0, 0); g.filter = 'none';
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 18 + rnd() * 40, gr = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = rnd() < 0.5 ? '0,0,0' : '255,255,255';
    gr.addColorStop(0, 'rgba(' + tone + ',0.10)'); gr.addColorStop(1, 'rgba(' + tone + ',0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const bump = noiseTex();

const scene = new THREE.Scene();
// Alttan bakan kamera: ekranda x sağa, y aşağı gider; SVG koordinatlarıyla aynı.
const cam = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 400);
cam.position.set(0, 0, -200); cam.up.set(0, -1, 0); cam.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6f655c, 0.32));
const sun = new THREE.DirectionalLight(0xffffff, 1.25); sun.position.set(-90, -110, -95); scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.18); fill.position.set(80, 60, -60); scene.add(fill);
const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, bumpMap: bump, bumpScale: 1.4, side: THREE.DoubleSide });

const out = {};
for (const it of LIST) {
  const data = new THREE.SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg">' + it.d + '</svg>');
  const shapes = [];
  // Üst üste binen noktalar kenar yuvarlamasını bozar; ayıklanmış noktalardan yeniden kur.
  data.paths.forEach((p) => THREE.SVGLoader.createShapes(p).forEach((sh) => {
    const pts = sh.getPoints(48).filter((q, i, a) => i === 0 || q.distanceTo(a[i - 1]) > 0.05);
    if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 0.05) pts.pop();
    shapes.push(new THREE.Shape(pts));
  }));
  const b = BEVEL[it.id] || 12;
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: true, bevelThickness: b * 1.3, bevelSize: b, bevelOffset: -b, bevelSegments: 12, curveSegments: 48 });
  // dokuyu şeklin düzlemine yay
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 200 + 0.37, pos.getY(i) / 200 + 0.61);
  const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
  renderer.render(scene, cam); scene.remove(mesh); geo.dispose();

  // Düz üst yüzeyi %50 griye çek: tüm opak piksellerin ortancası 128 olur.
  const c = document.createElement('canvas'); c.width = c.height = PX;
  const g = c.getContext('2d'); g.drawImage(renderer.domElement, 0, 0);
  const alpha = g.getImageData(0, 0, PX, PX).data;
  // Hafif bulanıklık köşe çizgilerini yumuşatır, elle sıvanmış kil gibi görünür; saydamlık korunur.
  g.clearRect(0, 0, PX, PX); g.filter = 'blur(1.6px)'; g.drawImage(renderer.domElement, 0, 0); g.filter = 'none';
  const img = g.getImageData(0, 0, PX, PX), d = img.data, lum = [];
  for (let i = 3; i < d.length; i += 4) d[i] = alpha[i];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250) lum.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
  lum.sort((a, z) => a - z);
  const k = 128 / lum[Math.floor(lum.length * 0.6)];
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, Math.round((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * k)));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  out[it.id] = c.toDataURL('image/webp', 0.86);
}
document.getElementById('out').textContent = JSON.stringify(out);
</script>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kil-'));
const file = path.join(tmp, 'uret.html');
fs.writeFileSync(file, page);
const chrome = [process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome'].find((p) => p && fs.existsSync(p));
if (!chrome) { console.error('Chrome bulunamadı; CHROME ortam değişkeniyle yolunu ver.'); process.exit(1); }
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--user-data-dir=' + path.join(tmp, 'profil'), '--virtual-time-budget=60000', '--dump-dom', 'file:///' + file.replace(/\\/g, '/')],
{ maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
const m = dom.match(/<pre id="out">([^<]+)<\/pre>/);
if (!m) { console.error('Çizim sonucu alınamadı.'); process.exit(1); }
const res = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
let total = 0;
for (const id of Object.keys(res)) {
  const buf = Buffer.from(res[id].split(',')[1], 'base64');
  fs.writeFileSync(path.join(root, 'assets/kil/sekil-' + id + '.webp'), buf);
  total += buf.length;
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(Object.keys(res).length + ' gölge resmi yazıldı (' + Math.round(total / 1024) + ' KB)');
