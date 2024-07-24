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
