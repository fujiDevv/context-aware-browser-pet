const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/Clawd/g, 'Arcrawls')
    .replace(/clawd/g, 'arcrawls')
    .replace(/CLAWD/g, 'ARCRAWLS');
    
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    // Skip build directories, git, and scripts
    if (file === 'node_modules' || file === 'dist' || file === 'dist-firefox' || file === '.git' || file === 'rebrand.cjs') continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else {
      const ext = path.extname(fullPath);
      if (['.ts', '.js', '.vue', '.html', '.css', '.json', '.md'].includes(ext)) {
        replaceInFile(fullPath);
      }
    }
  }
}

// 1. Replace text in files
processDirectory(__dirname);

// 2. Rename asset files
const petsDir = path.join(__dirname, 'assets', 'pets');
if (fs.existsSync(petsDir)) {
  const petFiles = fs.readdirSync(petsDir);
  for (const file of petFiles) {
    if (file.includes('clawd')) {
      const newName = file.replace(/clawd/g, 'arcrawls');
      fs.renameSync(path.join(petsDir, file), path.join(petsDir, newName));
      console.log(`Renamed ${file} to ${newName}`);
    }
  }
}

const rootAssetsDir = path.join(__dirname, 'assets');
if (fs.existsSync(rootAssetsDir)) {
  const rootFiles = fs.readdirSync(rootAssetsDir);
  for (const file of rootFiles) {
    if (file.includes('clawd')) {
      const newName = file.replace(/clawd/g, 'arcrawls');
      fs.renameSync(path.join(rootAssetsDir, file), path.join(rootAssetsDir, newName));
      console.log(`Renamed ${file} to ${newName}`);
    }
  }
}
