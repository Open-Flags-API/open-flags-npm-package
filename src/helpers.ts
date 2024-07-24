import * as path from 'path';
import * as fs from 'fs';

const listCountriesInRegion = (region: string): string[] => {
    const regionPath = path.join(__dirname, '..', 'assets', region);
    if (fs.existsSync(regionPath)) {
        return fs.readdirSync(regionPath).map(file => path.basename(file, '.svg'));
    } else {
        throw new Error(`Region ${region} not found`);
    }
};

export { listCountriesInRegion };
