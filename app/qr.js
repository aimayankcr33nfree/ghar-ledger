// Small QR encoder (byte mode, error correction M, versions 1–10) for the UPI payment link. No library.
const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]; // EC codewords per block (level M)
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
function mul(x, y) {let z = 0; for (let i = 7; i >= 0; i--) {z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x;} return z;}
function rsDivisor(n) {
	const r = new Array(n - 1).fill(0).concat([1]); let root = 1;
	for (let i = 0; i < n; i++) {for (let j = 0; j < r.length; j++) {r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1];} root = mul(root, 2);}
	return r;
}
function rsRemainder(data, div) {
	const r = div.map(() => 0);
	for (const b of data) {const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => {r[i] ^= mul(c, f);});}
	return r;
}
const rawModules = v => {let r = (16 * v + 128) * v + 64; if (v >= 2) {const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36;} return r;};
const dataCodewords = v => Math.floor(rawModules(v) / 8) - ECC[v] * BLOCKS[v];
function alignPos(v, size) {
	if (v === 1) return [];
	const n = Math.floor(v / 7) + 2, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6];
	for (let p = size - 7; r.length < n; p -= step) r.splice(1, 0, p);
	return r;
}
// returns a square array of booleans (true = dark)
export function qrMatrix(text) {
	const bytes = [...new TextEncoder().encode(text)];
	let v = 1;
	const cc = x => (x <= 9 ? 8 : 16);
	while (v <= 10 && 4 + cc(v) + bytes.length * 8 > dataCodewords(v) * 8) v++;
	if (v > 10) throw new Error('text too long for QR');
	const bits = [], put = (val, n) => {for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);};
	put(4, 4); put(bytes.length, cc(v)); bytes.forEach(b => put(b, 8));
	const cap = dataCodewords(v) * 8;
	put(0, Math.min(4, cap - bits.length));
	put(0, (8 - bits.length % 8) % 8);
	for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) put(p, 8);
	const data = [];
	for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
	// error correction + interleave
	const nb = BLOCKS[v], el = ECC[v], raw = Math.floor(rawModules(v) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(el), blocks = [];
	for (let i = 0, k = 0; i < nb; i++) {
		const d = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += d.length;
		const e = rsRemainder(d, div); if (i < nShort) d.push(0);
		blocks.push(d.concat(e));
	}
	const all = [];
	for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => {if (i !== shortLen - el || j >= nShort) all.push(b[i]);});
	// matrix
	const size = v * 4 + 17, m = [], fn = [];
	for (let y = 0; y < size; y++) {m.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false));}
	const set = (x, y, dark) => {m[y][x] = dark; fn[y][x] = true;};
	for (let i = 0; i < size; i++) {set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0);}
	const finder = (cx, cy) => {for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);}};
	finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
	const ap = alignPos(v, size);
	ap.forEach((a, i) => ap.forEach((b, j) => {
		if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return;
		for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
	}));
	const format = mask => {
		const d = mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
		const b = ((d << 10) | r) ^ 0x5412, g = i => ((b >>> i) & 1) === 1;
		for (let i = 0; i <= 5; i++) set(8, i, g(i));
		set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
		for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
		for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i));
		for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i));
		set(8, size - 8, true);
	};
	format(0);
	if (v >= 7) {
		let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
		const b = (v << 12) | r;
		for (let i = 0; i < 18; i++) {const bit = ((b >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bit); set(c, a, bit);}
	}
	let i = 0;
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5;
		for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
			const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
			if (!fn[y][x] && i < all.length * 8) {m[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++;}
		}
	}
	const masks = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
		(x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
		(x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => (((x + y) % 2) + (x * y) % 3) % 2 === 0];
	const apply = k => {for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && masks[k](x, y)) m[y][x] = !m[y][x];};
	let best = 0, bestScore = Infinity;
	for (let k = 0; k < 8; k++) {apply(k); format(k); const s = penalty(m); if (s < bestScore) {bestScore = s; best = k;} apply(k);}
	apply(best); format(best);
	return m;
}
function penalty(m) {
	const n = m.length; let s = 0, dark = 0;
	const lines = [];
	for (let y = 0; y < n; y++) {lines.push(m[y]); lines.push(m.map(r => r[y]));}
	for (const l of lines) {
		let run = 1;
		for (let i = 1; i <= n; i++) {if (i < n && l[i] === l[i - 1]) run++; else {if (run >= 5) s += run - 2; run = 1;}}
		const str = l.map(b => (b ? 1 : 0)).join('');
		for (const p of ['10111010000', '00001011101']) {let k = str.indexOf(p); while (k >= 0) {s += 40; k = str.indexOf(p, k + 1);}}
	}
	for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) s += 3;}
	for (const r of m) for (const b of r) if (b) dark++;
	return s + Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
}
// SVG markup with a 4-module quiet zone
export function qrSvg(text, px = 220) {
	const m = qrMatrix(text), n = m.length, q = 4, t = n + q * 2;
	let d = '';
	m.forEach((r, y) => r.forEach((b, x) => {if (b) d += `M${x + q} ${y + q}h1v1h-1z`;}));
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
