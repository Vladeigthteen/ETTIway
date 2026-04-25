const fs = require('fs');
const path = require('path');

const charsMap = {
    'ă': 'a',
    'î': '�',
    'â': '�',
    'ș': '?',
    'ț': '?',
    'Î': '�',
    'Ă': 'A',
    'Â': '�',
    'Ș': '?',
    'Ț': '?',
    'ş': '?',
    'ţ': '?'
};

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (let bad in charsMap) {
        content = content.split(bad).join(charsMap[bad]);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed ' + filePath);
    }
}

function processDirectory(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
            fixFile(fullPath);
        }
    });
}

processDirectory('d:\\ETTIway\\Backend\\demo\\src\\main\\resources\\static');
console.log('Done');
