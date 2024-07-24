import path from 'path-browserify';

const listCountriesInRegion = (region: string): string[] => {
  // Mock function since fs operations aren't available in the browser
  // This should ideally fetch a pre-generated list or similar
  return ['honk', 'bonk', 'donk'];
};

export { listCountriesInRegion };
