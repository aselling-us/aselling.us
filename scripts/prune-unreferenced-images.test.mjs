import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pruneUnreferencedImages } from './prune-unreferenced-images.mjs';

describe('pruneUnreferencedImages', () => {
  let dist, assets;

  beforeEach(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-images-'));
    assets = path.join(dist, '_astro');
    fs.mkdirSync(assets);
  });

  afterEach(() => {
    fs.rmSync(dist, { recursive: true, force: true });
  });

  const asset = (name, body = 'x') => fs.writeFileSync(path.join(assets, name), body);
  const exists = (name) => fs.existsSync(path.join(assets, name));

  it('deletes originals nothing references and keeps the webp variants', () => {
    asset('photo.AAA.jpg', '12345');
    asset('photo.AAA_1.webp');
    fs.writeFileSync(path.join(dist, 'index.html'), '<img src="/_astro/photo.AAA_1.webp">');

    expect(pruneUnreferencedImages(dist)).toEqual({ removed: 1, bytes: 5 });
    expect(exists('photo.AAA.jpg')).toBe(false);
    expect(exists('photo.AAA_1.webp')).toBe(true);
  });

  it('keeps an original that a page links to, in html, nested html, js or css', () => {
    for (const n of ['a.1.jpg', 'b.2.png', 'c.3.jpg', 'd.4.jpeg']) asset(n);
    fs.mkdirSync(path.join(dist, 'books'));
    fs.writeFileSync(path.join(dist, 'index.html'), '<a href="/_astro/a.1.jpg">');
    fs.writeFileSync(path.join(dist, 'books', 'index.html'), '<img src="/_astro/b.2.png">');
    fs.writeFileSync(path.join(assets, 'page.js'), 'const x = "/_astro/c.3.jpg";');
    fs.writeFileSync(path.join(assets, 'page.css'), 'a{background:url(/_astro/d.4.jpeg)}');

    expect(pruneUnreferencedImages(dist).removed).toBe(0);
    for (const n of ['a.1.jpg', 'b.2.png', 'c.3.jpg', 'd.4.jpeg']) expect(exists(n)).toBe(true);
  });

  it('never touches non-raster files, even unreferenced ones', () => {
    asset('font.5.woff2');
    asset('logo.6.svg');
    asset('pic.7.webp');
    expect(pruneUnreferencedImages(dist).removed).toBe(0);
    expect(exists('font.5.woff2') && exists('logo.6.svg') && exists('pic.7.webp')).toBe(true);
  });

  it('is a no-op without a dist/_astro folder', () => {
    fs.rmSync(assets, { recursive: true });
    expect(pruneUnreferencedImages(dist)).toEqual({ removed: 0, bytes: 0 });
  });
});
