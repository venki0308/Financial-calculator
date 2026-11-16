// Minimal PNG helpers (no dependencies): read the header, and convert between
// 24-bit RGB and 32-bit RGBA. Google Play wants screenshots and the feature
// graphic as 24-bit PNG (no alpha) and the icon as 32-bit PNG (with alpha).
// Handles 8-bit, non-interlaced, colour types 2 (RGB) and 6 (RGBA): what
// Chrome screenshots and the app icon use.
import zlib from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngInfo(buf) {
    if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
    const colorType = buf[25];
    return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
        bitDepth: buf[24],
        colorType,
        interlace: buf[28],
        hasAlpha: colorType === 6 || colorType === 4 || buf.includes(Buffer.from('tRNS')),
        bitsPerPixel: buf[24] * ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType] || 0),
        bytes: buf.length,
    };
}

function chunks(buf) {
    const out = [];
    let pos = 8;
    while (pos < buf.length) {
        const length = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        out.push({ type, data: buf.subarray(pos + 8, pos + 8 + length) });
        pos += 12 + length;
    }
    return out;
}

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decode to raw pixels: { width, height, channels (3|4), data }. */
export function decodePng(buf) {
    const info = pngInfo(buf);
    if (info.bitDepth !== 8 || info.interlace !== 0 || (info.colorType !== 2 && info.colorType !== 6)) {
        throw new Error(`unsupported PNG (depth ${info.bitDepth}, colour type ${info.colorType}, interlace ${info.interlace})`);
    }
    const channels = info.colorType === 6 ? 4 : 3;
    const raw = zlib.inflateSync(Buffer.concat(chunks(buf).filter(c => c.type === 'IDAT').map(c => c.data)));
    const stride = info.width * channels;
    const data = Buffer.alloc(stride * info.height);
    for (let y = 0; y < info.height; y++) {
        const filter = raw[y * (stride + 1)];
        const src = y * (stride + 1) + 1;
        const dst = y * stride;
        for (let x = 0; x < stride; x++) {
            const left = x >= channels ? data[dst + x - channels] : 0;
            const up = y > 0 ? data[dst - stride + x] : 0;
            const upLeft = y > 0 && x >= channels ? data[dst - stride + x - channels] : 0;
            let v = raw[src + x];
            if (filter === 1) v += left;
            else if (filter === 2) v += up;
            else if (filter === 3) v += (left + up) >> 1;
            else if (filter === 4) v += paeth(left, up, upLeft);
            data[dst + x] = v & 0xff;
        }
    }
    return { width: info.width, height: info.height, channels, data };
}

function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
}

/** Encode raw pixels ({ width, height, channels, data }) as an 8-bit PNG. */
export function encodePng({ width, height, channels, data }) {
    const stride = width * channels;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        // Filter "Up" compresses flat UI areas well and is cheap to compute.
        raw[y * (stride + 1)] = y === 0 ? 0 : 2;
        for (let x = 0; x < stride; x++) {
            const v = data[y * stride + x];
            raw[y * (stride + 1) + 1 + x] = y === 0 ? v : (v - data[(y - 1) * stride + x]) & 0xff;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = channels === 4 ? 6 : 2;
    return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** 24-bit RGB, no alpha. Transparent pixels are flattened onto `matte` ([r,g,b]). */
export function toRgb(buf, matte = [255, 255, 255]) {
    const img = decodePng(buf);
    if (img.channels === 3) return encodePng(img);
    const out = Buffer.alloc(img.width * img.height * 3);
    for (let i = 0, o = 0; i < img.data.length; i += 4, o += 3) {
        const a = img.data[i + 3] / 255;
        out[o] = Math.round(img.data[i] * a + matte[0] * (1 - a));
        out[o + 1] = Math.round(img.data[i + 1] * a + matte[1] * (1 - a));
        out[o + 2] = Math.round(img.data[i + 2] * a + matte[2] * (1 - a));
    }
    return encodePng({ width: img.width, height: img.height, channels: 3, data: out });
}

/** 32-bit RGBA. Pixels are unchanged; an opaque alpha channel is added if missing. */
export function toRgba(buf) {
    const img = decodePng(buf);
    if (img.channels === 4) return encodePng(img);
    const out = Buffer.alloc(img.width * img.height * 4);
    for (let i = 0, o = 0; i < img.data.length; i += 3, o += 4) {
        out[o] = img.data[i]; out[o + 1] = img.data[i + 1]; out[o + 2] = img.data[i + 2]; out[o + 3] = 255;
    }
    return encodePng({ width: img.width, height: img.height, channels: 4, data: out });
}
