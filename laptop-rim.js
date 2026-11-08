/*
 * The rim is one watertight mesh, drawn in a single pass. Shared vertices and
 * interpolated lighting avoid the bright seams between CSS-transformed faces.
 * Its camera and hinge exactly match the display's CSS transforms.
 */
function createLaptopRim(canvas, outline, depth, distance, lidWidth) {
  const material = createRimMaterial(canvas.parentElement.querySelector(".base"));
  const style = getComputedStyle(canvas.closest(".laptop"));
  const frontRoll = Number.parseFloat(style.getPropertyValue("--lid-front-roll"));
  const frontInset = Number.parseFloat(style.getPropertyValue("--lid-front-inset"));
  const backRoll = Number.parseFloat(style.getPropertyValue("--lid-back-roll"));
  const rings = [];
  // The front roll is deep but narrow, so rounding the closed shell doesn't
  // widen the metal trim around the open display.
  for (let step = 0; step <= 12; step++) {
    const angle = step * Math.PI / 24;
    rings.push([-depth + backRoll * (1 - Math.cos(angle)), backRoll * (1 - Math.sin(angle))]);
  }
  for (let step = 0; step <= 12; step++) {
    const angle = step * Math.PI / 24;
    rings.push([-frontRoll + frontRoll * Math.sin(angle), frontInset * (1 - Math.cos(angle))]);
  }
  const vertices = [];
  const indices = [];
  for (const [z, inset] of rings) {
    for (const [x, y, nx, ny] of outline) vertices.push(x - inset * nx, y - inset * ny, z, nx, ny);
  }
  const columns = outline.length;
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let edge = 0; edge < columns - 1; edge++) {
      const a = ring * columns + edge, b = a + 1, c = a + columns, d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return drawCanvasRim(canvas, vertices, indices, depth, distance, material, lidWidth);

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `
    attribute vec3 position;
    uniform vec2 rotation;
    uniform float depth;
    uniform float perspective;
    varying vec2 materialUV;
    void main() {
      float y = position.y - (273.0 - depth * 0.5);
      float z = position.z + depth * 0.5;
      vec3 p = vec3(position.x + ${((486 - lidWidth) / 2).toFixed(4)},
        273.0 - depth * 0.5 + y * rotation.x - z * rotation.y,
        -depth * 0.5 + y * rotation.y + z * rotation.x);
      float eye = perspective - p.z;
      vec2 screen = vec2(243.0, 273.0) + (p.xy - vec2(243.0, 273.0)) * perspective / eye;
      gl_Position = vec4((screen.x / 243.0 - 1.0) * eye,
        (1.0 - screen.y / 145.5) * eye, eye * 1.000500125 - 2.000500125, eye);
      // Use the same positions for the end reflections as the base fascia.
      float closedScale = perspective / (perspective - (273.0 - depth - position.y));
      materialUV = vec2((243.0 + (position.x - ${(lidWidth / 2).toFixed(4)}) * closedScale) / 486.0,
        (position.z + depth) / depth);
    }
  `));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 materialUV;
    uniform sampler2D material;
    void main() {
      gl_FragColor = texture2D(material, materialUV);
    }
  `));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 20, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  gl.uniform1f(gl.getUniformLocation(program, "depth"), depth);
  gl.uniform1f(gl.getUniformLocation(program, "perspective"), distance);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, material.width, material.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, material.data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, "material"), 0);
  const rotation = gl.getUniformLocation(program, "rotation");
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CW); // the CSS coordinate system has its y axis pointing down
  gl.clearColor(0, 0, 0, 0);

  return (transform) => {
    const ratio = Math.min(devicePixelRatio || 1, 3);
    const box = canvas.getBoundingClientRect();
    const width = Math.ceil(box.width * ratio), height = Math.ceil(box.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    const matrix = transform.startsWith("matrix3d") ? transform.slice(9, -1).split(",").map(Number) : null;
    gl.uniform2f(rotation, matrix ? matrix[5] : 1, matrix ? matrix[6] : 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  };
}

// Read the base's actual CSS gradients, including its centre mask and soft end
// reflections. Both renderers use this material instead of a second palette.
function createRimMaterial(base) {
  const style = getComputedStyle(base);
  const centerStyle = getComputedStyle(base, "::before");
  const highlightStyle = getComputedStyle(base, "::after");
  const em = Number.parseFloat(style.fontSize);
  function stops(gradient) {
    // Horizontal gradients mirror their absolute left stops with calc() on
    // the right. Sampling distance to the nearer end needs only the left half.
    return [...gradient.matchAll(/rgba?\(([^)]+)\)\s+([\d.]+)px/g)].map((match) => {
      const [r, g, b, a = 1] = match[1].split(",").map(Number);
      return [Number(match[2]) / em, [r, g, b, a]];
    });
  }
  function sample(ramp, value) {
    let previous = ramp[0];
    for (const next of ramp) {
      if (next[0] > value) {
        const t = Math.max(0, (value - previous[0]) / (next[0] - previous[0]));
        return previous[1].map((channel, index) => channel + (next[1][index] - channel) * t);
      }
      previous = next;
    }
    return previous[1];
  }
  const outer = stops(style.backgroundImage), center = stops(centerStyle.backgroundImage);
  const centerFade = stops(centerStyle.maskImage), highlight = stops(highlightStyle.backgroundImage.split(/\), linear-gradient/)[0]);
  const highlightFade = stops(highlightStyle.maskImage);
  const width = 1024, height = 256, data = new Uint8Array(width * height * 4);
  const tilt = parseFloat(highlightStyle.getPropertyValue("--corner-tilt")) * Math.PI / 180;
  const columns = Array.from({ length: width }, (_, x) => {
    const across = (x + 0.5) * 486 / width, edge = Math.min(across, 486 - across);
    return [sample(centerFade, edge)[3], edge * Math.cos(tilt)];
  });
  for (let y = 0; y < height; y++) {
    const t = (y + 0.5) / height, bodyY = t * 18;
    const edgeColor = sample(outer, bodyY), centerColor = sample(center, bodyY);
    const fade = sample(highlightFade, bodyY)[3];
    for (let x = 0; x < width; x++) {
      const [mask, across] = columns[x], offset = (y * width + x) * 4;
      const reflection = sample(highlight, across + (18 - bodyY) * Math.sin(tilt))[3];
      for (let channel = 0; channel < 3; channel++) {
        const metal = edgeColor[channel] + (centerColor[channel] - edgeColor[channel]) * mask;
        const lit = metal + (255 - metal) * reflection * fade;
        // The base's top contour supplies the contact seam. An extra dark
        // stripe here would double it and expose the perimeter's perspective.
        data[offset + channel] = Math.round(lit);
      }
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}

// Keep the physical edge when hardware rendering is unavailable. This uses
// the same mesh and camera, with slight overdraw to seal antialiased joins.
function drawCanvasRim(canvas, vertices, indices, depth, distance, material, lidWidth) {
  const context = canvas.getContext("2d");
  return (transform) => {
    const box = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 3);
    canvas.width = Math.ceil(box.width * ratio);
    canvas.height = Math.ceil(box.height * ratio);
    context.setTransform(canvas.width / 486, 0, 0, canvas.height / 291, 0, 0);
    const matrix = transform.startsWith("matrix3d") ? transform.slice(9, -1).split(",").map(Number) : null;
    const cosine = matrix ? matrix[5] : 1, sine = matrix ? matrix[6] : 0;
    const points = [];
    for (let offset = 0; offset < vertices.length; offset += 5) {
      const y = vertices[offset + 1] - (273 - depth / 2), z = vertices[offset + 2] + depth / 2;
      const worldY = 273 - depth / 2 + y * cosine - z * sine;
      const worldZ = -depth / 2 + y * sine + z * cosine;
      const scale = distance / (distance - worldZ);
      const closedScale = distance / (distance - (273 - depth - vertices[offset + 1]));
      const u = (243 + (vertices[offset] - lidWidth / 2) * closedScale) / 486;
      const t = (vertices[offset + 2] + depth) / depth;
      points.push([243 + (vertices[offset] - lidWidth / 2) * scale, 273 + (worldY - 273) * scale, worldZ, u, t]);
    }
    const triangles = [];
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = indices.slice(i, i + 3).map((index) => points[index]);
      if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 0) continue;
      triangles.push([a, b, c]);
    }
    triangles.sort((a, b) => a.reduce((sum, p) => sum + p[2], 0) - b.reduce((sum, p) => sum + p[2], 0));
    for (const triangle of triangles) {
      const u = triangle.reduce((sum, p) => sum + p[3], 0) / 3;
      const t = triangle.reduce((sum, p) => sum + p[4], 0) / 3;
      const x = Math.max(0, Math.min(material.width - 1, Math.round(u * (material.width - 1))));
      const y = Math.max(0, Math.min(material.height - 1, Math.round(t * (material.height - 1))));
      const offset = (y * material.width + x) * 4;
      context.fillStyle = context.strokeStyle = `rgb(${material.data.slice(offset, offset + 3).join(" ")})`;
      context.lineWidth = 0.4;
      context.beginPath();
      triangle.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.closePath();
      context.fill();
      context.stroke();
    }
  };
}

function initLaptopLid() {
  // The top edge closes the laptop; the same edge opens it again once shut.
  const laptop = document.querySelector(".laptop");
  const lid = laptop.querySelector(".lid");
  const lidToggle = laptop.querySelector(".lid-toggle");

  // Rounded perimeter shared by the solid rim and its perspective calibration.
  const lidWidth = Number.parseFloat(getComputedStyle(laptop).getPropertyValue("--lid-width"));
  const outline = [[14, 0, 0, -1], [lidWidth - 14, 0, 0, -1]];
  function corner(x, y, radius, from, steps) {
    for (let step = 1; step <= steps; step++) {
      const angle = (from + step * 90 / steps) * Math.PI / 180;
      const nx = Math.cos(angle), ny = Math.sin(angle);
      outline.push([x + nx * radius, y + ny * radius, nx, ny]);
    }
  }
  corner(lidWidth - 14, 14, 14, 270, 32);
  outline.push([lidWidth, 270, 1, 0]);
  corner(lidWidth - 3, 270, 3, 0, 12);
  outline.push([3, 273, 0, 1]);
  corner(3, 270, 3, 90, 12);
  outline.push([0, 14, -1, 0]);
  corner(14, 14, 14, 180, 32);

  const depth = Number.parseFloat(getComputedStyle(laptop).getPropertyValue("--lid-depth"));
  const frontDepth = 273 - depth;
  // Match the painted, rounded silhouette to the chassis, rather than matching
  // the bounding rectangle (whose square corners aren't actually painted).
  let near = frontDepth + 1, far = 10000;
  for (let iteration = 0; iteration < 40; iteration++) {
    const distance = (near + far) / 2;
    const width = 2 * Math.max(...outline.map(([x, y]) => Math.abs(x - lidWidth / 2) * distance / (distance - frontDepth + y)));
    if (width > 486) near = distance;
    else far = distance;
  }
  const distance = (near + far) / 2;
  laptop.style.setProperty("--lid-perspective", `${distance}em`);
  laptop.style.setProperty("--base-perspective-scale", 1 - frontDepth / distance);

  const canvas = laptop.querySelector(".lid-rim");
  const renderLidRim = createLaptopRim(canvas, outline, depth, distance, lidWidth);
  const listeners = new AbortController();
  const options = { signal: listeners.signal };

  // Follow the actual projected rim, rather than animating an unrelated hit area.
  let lidHandleFrame = 0;
  let lidAngle = 0;
  lid.style.transform = "rotateX(0rad)";
  function placeLidHandle() {
    try {
      renderLidRim(getComputedStyle(lid).transform);
    } catch (error) {
      // Return the whole device to an ordinary case-study link.
      listeners.abort();
      cancelAnimationFrame(lidHandleFrame);
      canvas.hidden = true;
      lidToggle.hidden = true;
      lid.classList.remove("shut");
      lid.style.transform = "rotateX(0rad)";
      laptop.classList.remove("lid-closed");
      dispatchEvent(new Event("lidchange"));
      console.warn("Laptop lid rendering stopped.", error);
      return false;
    }
    const box = laptop.getBoundingClientRect();
    const front = lid.querySelector(".lid-front").getBoundingClientRect();
    const back = lid.querySelector(".lid-back").getBoundingClientRect();
    const left = Math.min(front.left, back.left);
    lidToggle.style.left = `${left - box.left}px`;
    lidToggle.style.width = `${Math.max(front.right, back.right) - left}px`;
    lidToggle.style.top = `${(front.top + back.top) / 2 - box.top}px`;
    return true;
  }
  function lidEase(progress, closing) {
    const [x1, y1, x2, y2] = closing ? [0.45, 0, 0.8, 0.7] : [0.4, 0, 0.2, 1];
    const cubic = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
    let low = 0, high = 1;
    for (let step = 0; step < 18; step++) {
      const t = (low + high) / 2;
      if (cubic(t, x1, x2) < progress) low = t;
      else high = t;
    }
    return cubic((low + high) / 2, y1, y2);
  }
  lidToggle.addEventListener("click", () => {
    const closed = laptop.classList.toggle("lid-closed");
    lidToggle.setAttribute("aria-expanded", String(!closed));
    lidToggle.setAttribute("aria-label", `${closed ? "Open" : "Close"} laptop lid`);
    cancelAnimationFrame(lidHandleFrame);
    const from = lidAngle, target = closed ? -Math.PI / 2 : 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : (closed ? 650 : 850) * Math.abs(target - from) / (Math.PI / 2);
    const start = performance.now() + (closed && !reduced ? 200 : 0);
    // Drive the CSS display and rendered rim from one clock. An independent
    // compositor transition can put their surfaces a frame apart while folding.
    function fold(now) {
      const progress = duration ? Math.max(0, Math.min(1, (now - start) / duration)) : 1;
      lidAngle = progress === 1 ? target : from + (target - from) * lidEase(progress, closed);
      lid.style.transform = `rotateX(${lidAngle}rad)`;
      lid.classList.toggle("shut", lidAngle <= -Math.PI / 2 + 1e-7);
      if (!placeLidHandle()) return;
      if (progress < 1) lidHandleFrame = requestAnimationFrame(fold);
      else {
        lidHandleFrame = 0;
        dispatchEvent(new Event("lidchange"));
      }
    }
    fold(performance.now());
  }, options);
  addEventListener("resize", placeLidHandle, options);
  addEventListener("route", placeLidHandle, options);
  if (placeLidHandle()) lidToggle.hidden = false;
}

try {
  initLaptopLid();
} catch (error) {
  console.warn("Laptop lid animation unavailable.", error);
}
