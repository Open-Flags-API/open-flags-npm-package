// Jest transform for .svg imports: the module's default export is the file as a data URI, encoded the way
// Vite inlines SVGs in library mode (svgToDataURL in vite/src/node/plugins/asset.ts), so tests see the same
// strings the build ships.
const crypto = require('crypto');
const fs = require('fs');

const SELF = crypto.createHash('sha1').update(fs.readFileSync(__filename)).digest('hex');
const NESTED_QUOTES = /"[^"']*'[^"]*"|'[^'"]*"[^']*'/;

function svgToDataUri(svg) {
  if (svg.includes('<text') || svg.includes('<foreignObject') || NESTED_QUOTES.test(svg)) {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
  return (
    'data:image/svg+xml,' +
    svg
      .trim()
      .replace(/>\s+</g, '><')
      .replace(/"/g, "'")
      .replace(/%/g, '%25')
      .replace(/#/g, '%23')
      .replace(/</g, '%3c')
      .replace(/>/g, '%3e')
      .replace(/\s+/g, '%20')
  );
}

module.exports = {
  process(sourceText) {
    return { code: `module.exports = { __esModule: true, default: ${JSON.stringify(svgToDataUri(sourceText))} };` };
  },
  getCacheKey(sourceText) {
    return crypto.createHash('sha1').update(SELF).update(sourceText).digest('hex');
  },
};
