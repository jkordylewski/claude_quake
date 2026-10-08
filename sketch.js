// Past week of USGS earthquakes as pulsing rings on an equirectangular map.
// Size = magnitude, hue = depth (shallow warm, deep cool).

let quakes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(240, 40, 6);
  loadJSON(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
    data => {
      quakes = data.features.map(f => ({
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        depth: f.geometry.coordinates[2],
        mag: max(f.properties.mag || 0, 0.5),
        phase: random(1000),
      }));
    }
  );
}

function draw() {
  // translucent wash leaves soft trails
  noStroke();
  fill(240, 40, 6, 12);
  rect(0, 0, width, height);

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
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(240, 40, 6);
}
