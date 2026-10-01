const fs = require('fs');
const path = require('path');
const iso31662 = require('iso-3166-2');

const directoryPath = 'flags/mexico-copy'; // Update with your folder path

async function renameSvgs(): Promise<void> {
    fs.readdir(directoryPath, (err: NodeJS.ErrnoException | null, files: string[]) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }

        files.forEach((file: string) => {
            if (path.extname(file).toLowerCase() === '.svg') {
                const currentName = path.basename(file, '.svg');
                const subdivisionCode = iso31662.subdivision('US', currentName.charAt(0).toUpperCase() + currentName.slice(1));

                console.log(subdivisionCode);
                if (subdivisionCode) {
                    const oldFilePath = path.join(directoryPath, file);
                    const newFileName = `${subdivisionCode.regionCode}.svg`;
                    const newFilePath = path.join(directoryPath, newFileName);

                    fs.rename(oldFilePath, newFilePath, (err: NodeJS.ErrnoException | null) => {
                        if (err) {
                            console.error('Error renaming file:', err);
                        } else {
                            console.log(`Renamed: ${file} -> ${newFileName}`);
                        }
                    });
                } else {
                    console.log(`No subdivision code found for: ${file}`);
                }
            }
        });
    });
}

renameSvgs();
