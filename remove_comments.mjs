import fs from 'fs';
import path from 'path';

function stripComments(content, ext) {
    if (ext === '.css') {
        // Remove CSS comments
        return content.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    if (ext === '.html') {
        // Remove HTML comments
        return content.replace(/<!--[\s\S]*?-->/g, '');
    }
    if (ext === '.js' || ext === '.ts') {
        // Complex regex to safely remove JS/TS comments while ignoring strings and URLs
        return content.replace(/("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`)|(\/\*[\s\S]*?\*\/)|(\/\/.*)/g, 
        (match, stringMatch, blockComment, lineComment) => {
            if (stringMatch) return stringMatch; // Preserve strings
            return ''; // Remove comments
        });
    }
    return content;
}

const files = [
    'onboarding/onboarding.js',
    'onboarding/onboarding.css',
    'onboarding/onboarding.html',
    'popup/popup.ts',
    'popup/popup.css',
    'popup/popup.html'
];

const basePath = '/Users/joshuasarmiento/Documents/Github/contextual-pet-extension/context-aware-pet';

files.forEach(file => {
    const fullPath = path.join(basePath, file);
    if (!fs.existsSync(fullPath)) {
        console.error(`Missing file: ${fullPath}`);
        return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    let stripped = stripComments(content, path.extname(file));
    
    // Clean up excessive empty lines left over from removing block comments
    stripped = stripped.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(fullPath, stripped.trim() + '\n');
    console.log(`Removed comments from: ${file}`);
});
