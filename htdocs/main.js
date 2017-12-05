let canvas,
    context,
    imagedata,
    bufarray,
    buf8,
    buf32;

let drawing = false;

let cx, cy,
    rx = 3.0,
    ox = -0.5, oy = 0.0,
    dx = 0.0, dy = 0.0,
    zoom = 1.0,
    pixel_size = 1;

const max_pixel_size = 8;

let mousedown = false,
    mousezoom = false,
    mousex,
    mousey;

window.addEventListener("load", () => {
  resize();
  document.onkeyup = onkey;
  document.onkeydown = onkey;
  document.onmousedown = onmouse;
  document.onmousemove = onmouse;
  document.onmouseup = onmouse;
  window.onresize = resize;
});

function draw() {
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
        let color = Math.round(q * 0xff / max_iterations);
        let alpha = 0xff, r = color, b = color, g = color;
        for (xpix=0; xpix<pixel_size; xpix++) {
          buf32[offset++] = (alpha << 24) | (r << 16) | (g << 8) | b;
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

function flip() {
  imagedata.data.set(buf8);
  context.putImageData(imagedata, 0, 0);
}

function resize() {
  let aspect = window.innerWidth / window.innerHeight;

  canvas = document.getElementById('screen');
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
      zoom = iskeyup ? 1.0 : 0.95;
      break;
    case 189:   // -
      zoom = iskeyup ? 1.0 : 1.05;
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
      mousedown = true;
    case 'mousemove':
      if (!mousedown) return;
      mousezoom = true;
      mousex = ev.pageX / window.innerWidth;
      mousey = ev.pageY / window.innerHeight;
      break;
    case 'mouseup':
      mousedown = false;
      mousezoom = false;
      dx = dy = 0.0;
      zoom = 1.0;
      break;
    default:
      return;
  }

  if (!drawing) draw();
}

