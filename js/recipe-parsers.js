export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseNumber(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function parseDuration(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val);

  const isoMatch = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    return (parseInt(isoMatch[1]) || 0) * 60 + (parseInt(isoMatch[2]) || 0);
  }

  const num = parseInt(str.match(/\d+/)?.[0]);
  return isNaN(num) ? 0 : num;
}

export function extractImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (Array.isArray(image) && image.length > 0) return extractImageUrl(image[0]);
  if (image.url) return image.url;
  if (image['@id']) return image['@id'];
  return '';
}