const hamburg = require('!!raw-loader!../assets/flags/germany/hamburg.svg');

const svgMap: { [key: string]: string } = {
  'germany/hamburg': hamburg,
};

const getSvgContent = (region: string, country: string): string => {
  const key = `${region}/${country}`;
  const svgContent = svgMap[key];
  if (!svgContent) {
    throw new Error(`SVG for ${country} in ${region} not found`);
  }
  return svgContent;
};

const listCountriesInRegion = (region: string): string[] => {
  return Object.keys(svgMap)
    .filter(key => key.startsWith(region))
    .map(key => key.split('/')[1]);
};

export { getSvgContent, listCountriesInRegion };
