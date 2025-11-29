import sharp from 'sharp';

export async function ensureWebpQuality(input: Buffer, quality: number): Promise<Buffer> {
  return sharp(input)
    .webp({ quality, effort: quality >= 90 ? 5 : 2 })
    .toBuffer();
}
