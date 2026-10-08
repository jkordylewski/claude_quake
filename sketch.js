// Past week of USGS earthquakes as pulsing rings on an equirectangular map.
// Size = magnitude, hue = depth (shallow warm, deep cool).
// Each epicenter also lets a drip of paint run down the canvas.

let quakes = [];
let land = []; // array of rings, each an array of [lon, lat]
let paint; // persistent layer holding the drip trails

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(240, 40, 6);
  makePaint();
  // low-res (110m) Natural Earth coastlines: deliberately rough
  loadJSON(
    'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_land.geojson',
    data => {
      for (const f of data.features) {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        for (const poly of polys) land.push(...poly);
      }
    }
  );
  loadJSON(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
    data => {
      quakes = data.features.map(f => {
        const mag = max(f.properties.mag || 0, 0.5);
        return {
          lon: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
          depth: f.geometry.coordinates[2],
          mag,
          phase: random(1000),
          drip: newDrip(mag, random(0, 600)),
        };
      });
    }
  );
}

function makePaint() {
  paint = createGraphics(width, height);
  paint.colorMode(HSB, 360, 100, 100, 100);
}

function newDrip(mag, wait) {
  return {
    wait, // frames until the drip starts
    running: false,
    dy: 0, // pixels travelled down from the epicenter
    offX: 0,
    age: 0,
    seed: random(1000),
    maxLen: (30 + mag * 40) * random(0.6, 1.3),
    w: 1.5 + mag * 0.8,
  };
}

function draw() {
  // translucent wash leaves soft trails
  noStroke();
  fill(240, 40, 6, 12);
  rect(0, 0, width, height);

  // slowly dry out old paint
  if (frameCount % 4 === 0) {
    paint.erase(6, 6);
    paint.noStroke();
    paint.rect(0, 0, width, height);
    paint.noErase();
  }

  // faint continent outlines
  noFill();
  stroke(220, 20, 90, 18);
  strokeWeight(1);
  for (const ring of land) {
    beginShape();
    for (const [lon, lat] of ring) {
      vertex(map(lon, -180, 180, 0, width), map(lat, 90, -90, 0, height));
    }
    endShape();
  }

  for (const q of quakes) {
    const x = map(q.lon, -180, 180, 0, width);
    const y = map(q.lat, 90, -90, 0, height);
    const hue = map(constrain(q.depth, 0, 300), 0, 300, 20, 260);
    updateDrip(q, x, y, hue);
  }

  image(paint, 0, 0);

  noFill();
  for (const q of quakes) {
    const x = map(q.lon, -180, 180, 0, width);
    const y = map(q.lat, 90, -90, 0, height);
    const maxR = q.mag * 14;
    const t = ((frameCount + q.phase) % 120) / 120; // 0..1 pulse
    const hue = map(constrain(q.depth, 0, 300), 0, 300, 20, 260);

    stroke(hue, 70, 100, (1 - t) * 80);
    strokeWeight(1 + q.mag * 0.3);
    circle(x, y, t * maxR * 2);

    // bead of paint at the head of a running drip
    const d = q.drip;
    if (d.running) {
      noStroke();
      fill(hue, 80, 100, 95);
      circle(x + d.offX, y + d.dy, d.w);
      noFill();
    }
  }
}

function updateDrip(q, x, y, hue) {
  const d = q.drip;

  if (!d.running) {
    if (--d.wait > 0) return;
    // start: a blob of paint lands on the epicenter
    d.running = true;
    d.dy = 0;
    d.age = 0;
    d.offX = random(-2, 2);
    paint.noStroke();
    paint.fill(hue, 80, 100, 90);
    paint.circle(x + d.offX, y, d.w * 1.6);
    return;
  }

  // stick-slip motion: noise gates the speed, easing off near the end
  const slip = max(0, noise(d.seed, frameCount * 0.02) - 0.4) * 7;
  const ease = 1 - d.dy / d.maxLen;
  const step = slip * ease;
  const prev = d.dy;
  d.dy += step;
  d.age++;

  paint.stroke(hue, 80, 95, 85);
  paint.strokeWeight(d.w * 0.5);
  paint.line(x + d.offX, y + prev, x + d.offX, y + d.dy);

  if (ease < 0.03 || d.age > 900) {
    // dried: leave a bulb at the end of the run
    paint.noStroke();
    paint.fill(hue, 80, 100, 90);
    paint.circle(x + d.offX, y + d.dy, d.w * 1.1);
    d.running = false;
    d.wait = random(300, 900);
    d.maxLen = (30 + q.mag * 40) * random(0.6, 1.3);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(240, 40, 6);
  makePaint();
  for (const q of quakes) {
    q.drip.running = false;
    q.drip.wait = random(30, 300);
  }
}
