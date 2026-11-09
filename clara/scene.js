// Cena Three.js persistente: um único campo de partículas que se reorganiza a cada era.
//  passado  → caos (dados dispersos)
//  presente → esfera ordenada (portfólio consolidado)
//  futuro   → fluxo/trilho que avança para o fundo (pipeline)
import * as THREE from 'three';
import gsap from 'gsap';

const N = 7000;

const vert = /* glsl */ `
  attribute vec3 aChaos;
  attribute vec3 aOrder;
  attribute vec3 aFuture;
  attribute float aRand;
  uniform float uA;      // caos -> ordem
  uniform float uB;      // ordem -> futuro
  uniform float uTime;
  uniform float uSize;
  uniform float uPixel;
  uniform vec3 uCenter;
  uniform float uScale;
  varying float vRand;
  varying float vA;
  varying float vB;

  float ease(float t){ return t*t*(3.0-2.0*t); }

  void main(){
    // cada partícula tem seu atraso: a transição "escorre" em vez de acontecer em bloco
    float a = ease(clamp(uA*1.7 - aRand*0.7, 0.0, 1.0));
    float b = ease(clamp(uB*1.7 - aRand*0.7, 0.0, 1.0));
    float ang = uTime*0.07;
    vec3 o = vec3(aOrder.x*cos(ang) - aOrder.z*sin(ang), aOrder.y, aOrder.x*sin(ang) + aOrder.z*cos(ang)) * uScale + uCenter;
    vec3 p = mix(mix(aChaos, o, a), aFuture, b);

    // deriva orgânica, forte no caos e sutil na ordem
    float drift = mix(1.0, 0.12, a) * (1.0 - b*0.6);
    p += drift * vec3(
      sin(uTime*0.35 + aRand*40.0),
      cos(uTime*0.28 + aRand*55.0),
      sin(uTime*0.22 + aRand*70.0)
    ) * 0.55;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float s = uSize * (0.55 + aRand*0.9);
    gl_PointSize = s * uPixel * (18.0 / -mv.z);
    vRand = aRand; vA = a; vB = b;
  }
`;

const frag = /* glsl */ `
  uniform vec3 cChaos;
  uniform vec3 cChaos2;
  uniform vec3 cOrder;
  uniform vec3 cFuture;
  uniform float uOpacity;
  uniform vec3 cAlert;
  uniform float uAlert;
  varying float vRand;
  varying float vA;
  varying float vB;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    glow = pow(glow, 1.2);
    vec3 chaos = mix(cChaos, cChaos2, step(0.93, vRand));
    vec3 col = mix(mix(chaos, cOrder, vA), cFuture, vB);
    col = mix(col, cAlert, uAlert * (0.55 + vRand*0.45));
    gl_FragColor = vec4(col, glow * uOpacity * (0.22 + vRand*0.5));
  }
`;

function buildAttributes() {
  const chaos = new Float32Array(N * 3);
  const order = new Float32Array(N * 3);
  const future = new Float32Array(N * 3);
  const rand = new Float32Array(N);
  const golden = Math.PI * (3 - Math.sqrt(5));

  // trilho do futuro: curva que sobe à direita e afunda no eixo z
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-16, -7, 6),
    new THREE.Vector3(-6, -4, 0),
    new THREE.Vector3(3, -0.5, -8),
    new THREE.Vector3(10, 3, -22),
    new THREE.Vector3(16, 6, -45),
  ]);
  const tmp = new THREE.Vector3();

  for (let i = 0; i < N; i++) {
    const r = Math.random();
    rand[i] = r;

    // caos: volume amplo e irregular
    chaos[i * 3] = (Math.random() - 0.5) * 46;
    chaos[i * 3 + 1] = (Math.random() - 0.5) * 26;
    chaos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 4;

    // ordem: esfera de Fibonacci com casca dupla
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    const R = i % 7 === 0 ? 4.5 : 3.9;
    order[i * 3] = Math.cos(th) * rad * R;
    order[i * 3 + 1] = y * R;
    order[i * 3 + 2] = Math.sin(th) * rad * R;

    // futuro: tubo ao longo do trilho
    const t = i / N;
    curve.getPointAt(t, tmp);
    const ang = Math.random() * Math.PI * 2;
    const spread = 0.4 + Math.pow(Math.random(), 2.2) * (1.5 + t * 2.5);
    future[i * 3] = tmp.x + Math.cos(ang) * spread;
    future[i * 3 + 1] = tmp.y + Math.sin(ang) * spread;
    future[i * 3 + 2] = tmp.z + (Math.random() - 0.5) * spread;
  }
  return { chaos, order, future, rand };
}

// Estado da cena por slide (data-id). c = centro da esfera, k = escala, o = opacidade, al = alerta
const SPHERE_DONUT = [4.48, 2.09, -2]; // projeta atrás do donut (x≈1260px, y≈400px em 1920×1080)
const STATES = {
  capa:        { uA: 0,    uB: 0, cam: [0, 0, 26],   look: [0, 0, 0],     fov: 50 },
  tempos:      { uA: 0.38, uB: 0, cam: [0, 0, 22],   look: [0, 0, 0],     fov: 50, o: 0.75, c: [0, 0, -4], k: 1.6 },
  cap1:        { uA: 0,    uB: 0, cam: [2, 0, 7],    look: [3, 0, -10],   fov: 60 },
  passado:     { uA: 0,    uB: 0, cam: [0, 0, 20],   look: [0, 0, 0],     fov: 50 },
  ciclo:       { uA: 0,    uB: 0, cam: [5, -2, 15],  look: [5, 0, -4],    fov: 52, o: 0.55 },
  cap2:        { uA: 1,    uB: 0, cam: [0, 0, 17],   look: [0, 0, 0],     fov: 46, c: [5.6, 0.2, -2], k: 1.45 },
  presente:    { uA: 1,    uB: 0, cam: [0, 0, 17],   look: [0, 0, 0],     fov: 46, c: SPHERE_DONUT },
  frentes:     { uA: 1,    uB: 0, cam: [0, 0, 17],   look: [0, 0, 0],     fov: 46, c: [0, -19, -8], k: 3.4, o: 0.7 },
  curso:       { uA: 1,    uB: 0, cam: [0, 0, 17],   look: [0, 0, 0],     fov: 46, c: [13, 3, -8], k: 1.4, o: 0.5 },
  risco:       { uA: 1,    uB: 0, cam: [0, 0, 17],   look: [0, 0, 0],     fov: 46, c: [3, 1, -34], k: 3, o: 0.8, al: 1 },
  cap3:        { uA: 1,    uB: 1, cam: [-3, -1, 15], look: [9, 3, -30],   fov: 52, o: 0.8 },
  futuro:      { uA: 1,    uB: 1, cam: [-7, -3.5, 13], look: [6, 2.5, -20], fov: 55 },
  prioridades: { uA: 1,    uB: 1, cam: [4, 6, 2],    look: [14, 5, -40],  fov: 55, o: 0.3 },
  sintese:     { uA: 1,    uB: 1, cam: [-4, 2, 42],  look: [2, 0, -10],   fov: 48, o: 0.7 },
};
const DEF = { o: 1, c: SPHERE_DONUT, k: 1, al: 0 };

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0xf5f7fb, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf5f7fb, 0.022);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

  const { chaos, order, future, rand } = buildAttributes();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(chaos.slice(), 3));
  geo.setAttribute('aChaos', new THREE.BufferAttribute(chaos, 3));
  geo.setAttribute('aOrder', new THREE.BufferAttribute(order, 3));
  geo.setAttribute('aFuture', new THREE.BufferAttribute(future, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);

  const uniforms = {
    uA: { value: 0 }, uB: { value: 0 }, uTime: { value: 0 },
    uSize: { value: 4.6 }, uCenter: { value: new THREE.Vector3(4.48, 2.09, -2) }, uScale: { value: 1 }, uAlert: { value: 0 },
    cAlert: { value: new THREE.Color('#c9374f') }, uPixel: { value: 1 }, uOpacity: { value: 0 },
    cChaos: { value: new THREE.Color('#8b93ad') },
    cChaos2: { value: new THREE.Color('#c9374f') },
    cOrder: { value: new THREE.Color('#224c9c') },
    cFuture: { value: new THREE.Color('#22a33c') },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, uniforms,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // estado da câmera animável
  const cam = { x: 0, y: 0, z: 20, lx: 0, ly: 0, lz: 0, fov: 50 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
  });

  function resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPixel.value = dpr * (h / 1080);
  }
  resize();
  window.addEventListener('resize', resize);

  const fade = { v: 0 };
  const look = { o: 1 };
  const clock = new THREE.Clock();
  gsap.ticker.add(() => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uOpacity.value = fade.v * look.o;
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    camera.position.set(cam.x + mouse.x * 0.9, cam.y - mouse.y * 0.6, cam.z);
    camera.lookAt(cam.lx, cam.ly, cam.lz);
    if (camera.fov !== cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    points.rotation.y = Math.sin(t * 0.05) * 0.04 * (1 - uniforms.uA.value);
    renderer.render(scene, camera);
  });

  return {
    intro() {
      gsap.fromTo(fade, { v: 0 }, { v: 1, duration: 2.4, ease: 'power2.out' });
      gsap.fromTo(cam, { z: 34 }, { z: 20, duration: 3.2, ease: 'expo.out' });
    },
    to(name, duration = 2.2) {
      const s = STATES[name];
      if (!s) return;
      const ease = 'power3.inOut';
      gsap.to(uniforms.uA, { value: s.uA, duration: duration * 1.1, ease: 'power2.inOut' });
      gsap.to(uniforms.uB, { value: s.uB, duration: duration * 1.1, ease: 'power2.inOut' });
      gsap.to(cam, {
        x: s.cam[0], y: s.cam[1], z: s.cam[2], lx: s.look[0], ly: s.look[1], lz: s.look[2], fov: s.fov,
        duration, ease,
      });
      const v = { ...DEF, ...s };
      gsap.to(uniforms.uCenter.value, { x: v.c[0], y: v.c[1], z: v.c[2], duration: duration * 1.1, ease });
      gsap.to(uniforms.uScale, { value: v.k, duration: duration * 1.1, ease });
      gsap.to(uniforms.uAlert, { value: v.al, duration: duration, ease: 'power2.inOut' });
      gsap.to(look, { o: v.o, duration, ease: 'power2.inOut' });
    },
    set(name) {
      const s = STATES[name];
      const v = { ...DEF, ...s };
      uniforms.uA.value = s.uA; uniforms.uB.value = s.uB;
      uniforms.uCenter.value.set(...v.c); uniforms.uScale.value = v.k; uniforms.uAlert.value = v.al; look.o = v.o;
      Object.assign(cam, { x: s.cam[0], y: s.cam[1], z: s.cam[2], lx: s.look[0], ly: s.look[1], lz: s.look[2], fov: s.fov });
    },
  };
}
