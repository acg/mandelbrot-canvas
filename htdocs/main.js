let legend,
    show_legend = true,
    canvas,
    context,
    imagedata,
    bufarray,
    buf8,
    buf32;

let drawing = false;

const default_rx = 3.0,
      default_ox = -0.5,
      default_oy = 0.0;

let cx, cy,
    rx = default_rx,
    ox = default_ox, oy = default_oy,
    dx = 0.0, dy = 0.0,
    zoom = 1.0,
    pixel_size = 1;

const max_pixel_size = 8;

let seed_colors;
const total_colors = 1 << 16;
const palette = new Uint32Array(total_colors * 4);

let mousedown = false,
    mousezoom = false,
    mousex,
    mousey;

window.addEventListener("load", () => {
  legend = document.getElementById('legend');
  canvas = document.getElementById('screen');
  palettize();
  resize();
  window.onresize = resize;

  document.onkeyup     =
  document.onkeydown   = onkey;

  document.onmousedown =
  document.onmousemove =
  document.onmouseup   =
  canvas.ontouchstart  =
  canvas.ontouchmove   =
  canvas.ontouchend    = onmouse;
});

function draw() {
  legend.style.display = show_legend ? "inherit" : "none";
  drawing = true;
  render();
  flip();
  if (mousezoom) {
    const ry = rx * cy / cx,
          px = -rx + 2 * rx * mousex,
          py = -ry + 2 * ry * mousey;
    zoom = 0.975;
    dx = (1 - zoom) * px;
    dy = (1 - zoom) * py;
    if (pixel_size < max_pixel_size) pixel_size *= 2;
  }
  drawing = dx || dy || zoom !== 1.0;
  if (!drawing && pixel_size > 1) {
    pixel_size = pixel_size >> 1;
    drawing = true;
  }
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
  const dx = pixel_size*(bx-ax)/cx, dy = pixel_size*(by-ay)/cy;

  let x, y, xpix, ypix;
  let offset = 0;
  let max_iterations = Math.floor(Math.max(100, -100 * Math.log(rx)));

  for (y=ay, ny=0; ny<cy; y+=dy, ny+=pixel_size) {
    for (ypix=0; ypix<pixel_size; ypix++) {
      for (x=ax, nx=0; nx<cx; x+=dx, nx+=pixel_size) {
        let q = mandelbrot_escapes(x,y,max_iterations);
        let color = Math.floor(total_colors * (q-1) / max_iterations);
        let rgba = palette[color];
        for (xpix=0; xpix<pixel_size; xpix++) {
          buf32[offset++] = rgba;
        }
      }
    }
  }
}

function mandelbrot_escapes(cx, cy, n) {
  let zx = 0, zy = 0, zxsq = 0, zysq = 0;
  let i = 0;

  while (n > 0 && zxsq + zysq <= 4.0) {
    zy = zx * zy;
    zy += zy;
    zy += cy;
    zx = zxsq - zysq + cx;
    zxsq = zx * zx;
    zysq = zy * zy;
    n--; i++;
  }

  if (n > 0) i += 4.0 / (zxsq + zysq);

  return i;
}

function palettize() {
  const randomize = !!seed_colors;
  seed_colors = Array(32).fill(0)
    .map((_x, i) => hsl2rgb(randomize ? Math.random() : (i / 32), 1, 0.5))
    .concat({ r: 0, g: 0, b: 0 });

  let i, offset;
  for (i=0, offset=0; i<total_colors; i++) {
    let t = i * (seed_colors.length-1) / total_colors;
    let color_1 = seed_colors[Math.floor(t)];
    let color_2 = seed_colors[Math.floor(t)+1];
    let d = t - Math.floor(t);
    let r = Math.floor(0xff * (color_1.r + d * (color_2.r - color_1.r))),
        g = Math.floor(0xff * (color_1.g + d * (color_2.g - color_1.g))),
        b = Math.floor(0xff * (color_1.b + d * (color_2.b - color_1.b)));
    palette[offset++] = 0xff000000 | (r << 16) | (g << 8) | b;
  }
}

function hsl2rgb(h, s, l) {
  let hprime = 6 * h;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs(hprime % 2 - 1));
  let r, g, b;
  switch (Math.floor(hprime)) {
    case 0  : r = c; g = x; b = 0; break;
    case 1  : r = x; g = c; b = 0; break;
    case 2  : r = 0; g = c; b = x; break;
    case 3  : r = 0; g = x; b = c; break;
    case 4  : r = x; g = 0; b = c; break;
    case 5  : r = c; g = 0; b = x; break;
    default : r = 1; g = 1; b = 1; break;
  }
  return { r, g, b };
}

function flip() {
  imagedata.data.set(buf8);
  context.putImageData(imagedata, 0, 0);
}

function resize() {
  let aspect = window.innerWidth / window.innerHeight;

  canvas.width = cx = window.innerWidth & ~0xf;
  canvas.height = cy = Math.floor(canvas.width / aspect) & ~0xf;

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
  if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
  if (ev.keyCode === 16) return; // shift key by itself

  show_legend = false;

  const ry = rx * cy / cx;

  switch (ev.keyCode)
  {
    case 37:    // left
    case 72:    // j
      dx = iskeyup ? 0 : (-5 * rx / cx); break;
    case 39:    // right
    case 76:    // l
      dx = iskeyup ? 0 : (5 * rx / cx); break;
    case 38:    // up
    case 75:    // k
      dy = iskeyup ? 0 : (-5 * ry / cy); break;
    case 40:    // down
    case 74:    // j
      dy = iskeyup ? 0 : (5 * ry / cy); break;
    case 187:   // =
      zoom = iskeyup ? 1.0 : 0.95;
      break;
    case 189:   // -
      zoom = iskeyup ? 1.0 : 1.05;
      break;
    case 48:    // 0
      rx = default_rx;
      ox = default_ox;
      oy = default_oy;
      show_legend = true;
      break;
    case 67:    // c
      if (iskeyup) palettize();
      break;
    case 191:   // ?
      if (iskeyup) show_legend = true;
      break;
    default:
      return;
  }

  if (pixel_size < max_pixel_size) pixel_size *= 2;

  if (!drawing) draw();
}

function onmouse(ev) {
  switch (ev.type) {
    case 'mousedown':
    case 'touchstart':
      mousedown = true;
    case 'mousemove':
    case 'touchmove':
      if (!mousedown) return;
      mousezoom = true;
      mousex = ev.pageX / window.innerWidth;
      mousey = ev.pageY / window.innerHeight;
      break;
    case 'mouseup':
    case 'touchend':
      mousedown = false;
      mousezoom = false;
      dx = dy = 0.0;
      zoom = 1.0;
      break;
    default:
      return;
  }

  show_legend = false;

  if (!drawing) draw();
}

