import * as path from 'path';
import * as fs from 'fs';
const getSvgPath = (region, country) => {
    const filePath = path.join(__dirname, '..', 'assets', region, `${country}.svg`);
    if (fs.existsSync(filePath)) {
        return filePath;
    }
    else {
        throw new Error(`SVG for ${country} in ${region} not found`);
    }
};
export { getSvgPath };
