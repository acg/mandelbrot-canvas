let canvas,
    context,
    imagedata,
    bufarray,
    buf8,
    buf32;

let drawing = false;

const iterations = 100;

let cx, cy,
    rx = 2.0,
    ox = 0.0, oy = 0.0,
    dx = 0.0, dy = 0.0,
    zoom = 1.0;

window.addEventListener("load", () => {
  resize();
  document.onkeyup = onkey;
  document.onkeydown = onkey;
  window.onresize = resize;
});

function draw() {
  drawing = true;
  render();
  flip();
  drawing = dx || dy || zoom !== 1.0;
  if (!drawing) return;
  ox += dx;
  oy += dy;
  rx = rx * zoom;
  window.setTimeout(draw, 0);
}

function render() {
  const ry = rx * cy / cx;
  const ax = ox-rx, ay = oy-ry;
  const bx = ox+rx, by = oy+ry;
  const dx = (bx-ax)/cx, dy = (by-ay)/cy;

  let x, y;
  let offset = 0;

  for (y=ay, ny=0; ny<cy; y+=dy, ny++) {
    for (x=ax, nx=0; nx<cx; x+=dx, nx++) {
      let q = mandelbrot_escapes(x,y,iterations);
      let color = Math.round(q * 0xff / iterations);
      let alpha = 0xff, r = color, b = color, g = color;
      buf32[offset++] = (alpha << 24) | (r << 16) | (g << 8) | b;
    }
  }
}

function mandelbrot_escapes(cx, cy, n) {
  let zx = 0, zy = 0;
  let i = 0;

  while (n > 0) {
    if (zx * zx + zy * zy > 2.0) return i;
    let newzx = zx * zx - zy * zy + cx;
    let newzy = 2 * zx * zy + cy;
    zx = newzx;
    zy = newzy;
    n--; i++;
  }

  return i;
}

function flip() {
  imagedata.data.set(buf8);
  context.putImageData(imagedata, 0, 0);
}

function resize() {
  let aspect = window.innerWidth / window.innerHeight;

  canvas = document.getElementById('screen');
  canvas.width = cx = window.innerWidth < 800 ? window.innerWidth : 800;
  canvas.height = cy = canvas.width / aspect;

  if (canvas.getContext) {
    context = canvas.getContext('2d');
    imagedata = context.createImageData(cx, cy);
  }

  bufarray = new ArrayBuffer(imagedata.width * imagedata.height * 4);
  buf8     = new Uint8Array(bufarray);
  buf32    = new Uint32Array(bufarray);

  draw();
}

function onkey(ev) {
  const iskeydown = (ev.type === "keydown");
  const iskeyup = (ev.type === "keyup");

  if (!iskeydown && !iskeyup) return;

  const ry = rx * cy / cx;

  switch (ev.keyCode)
  {
    case 37:    // left
      dx = iskeyup ? 0 : (-5 * rx / cx); break;
    case 39:    // right
      dx = iskeyup ? 0 : (5 * rx / cx); break;
    case 38:    // up
      dy = iskeyup ? 0 : (-5 * ry / cy); break;
    case 40:    // down
      dy = iskeyup ? 0 : (5 * ry / cy); break;
    case 187:   // =
      zoom = iskeyup ? 1.0 : 0.95; break;
    case 189:   // -
      zoom = iskeyup ? 1.0 : 1.05; break;
    default:
      return;
  }

  if (!drawing) draw();
}

