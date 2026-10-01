const fs = require('fs');
const path = require('path');

const flagsDir = path.resolve(__dirname, '../flags');
const outputFilePath = path.resolve(__dirname, '../flags/index.ts');

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach((f: string) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const imports: string[] = [];
const exportsArr: string[] = [];
const flagList: string[] = [];

walkDir(flagsDir, (filePath: string) => {
  if (filePath.endsWith('.svg')) {
    const relativePath = path.relative(flagsDir, filePath).replace(/\\/g, '/');
    const sanitizedImportName = relativePath.replace(/\W/g, '_').replace('.svg', '');
    const originalPath = relativePath.replace(/'/g, "\\'");
    imports.push(`import ${sanitizedImportName} from './${originalPath}';`);
    exportsArr.push(`  "${relativePath.replace('.svg', '').replace(/'/g, "\\'")}": ${sanitizedImportName},`);
    flagList.push(`"${relativePath.replace('.svg', '').replace(/'/g, "\\'")}"`);
  }
});

const fileContent = `${imports.join('\n')}

export const flags: Record<string, string> = {
${exportsArr.join('\n')}
};

export const flagList: string[] = [
${flagList.join(',\n')}
];
`;

fs.writeFileSync(outputFilePath, fileContent);
console.log(`Generated ${outputFilePath}`);

const generateFlagsNameMapScript = () => {
  const flagsDir = path.join(__dirname, '../flags');
  const isoMapping: Record<string, { country: string, subdivision: string }> = {};

  if (!fs.existsSync(flagsDir)) {
    throw new Error(`Directory not found: ${flagsDir}`);
  }

  const countries = fs.readdirSync(flagsDir).filter((file: string) => {
    const filePath = path.join(flagsDir, file);
    return fs.lstatSync(filePath).isDirectory();
  });

  countries.forEach((country: string) => {
    const subdivisions = fs.readdirSync(path.join(flagsDir, country)).filter((file: string) => {
      return file.endsWith('.svg');
    });

    subdivisions.forEach((subdivision: string) => {
      const isoCode = `${country.toUpperCase()}-${subdivision.split('.')[0].toUpperCase()}`;
      isoMapping[isoCode] = { country, subdivision: subdivision.split('.')[0] };
    });
  });

  fs.writeFileSync(path.join(__dirname, '../src/iso-mapping.json'), JSON.stringify(isoMapping, null, 2));
  console.log('ISO mapping generated successfully');
};

generateFlagsNameMapScript();