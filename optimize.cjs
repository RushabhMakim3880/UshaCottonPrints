const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let filesDir = fs.readdirSync(dir);
  filelist = filelist || [];
  filesDir.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const files = walkSync('public/images').filter(f => f.match(/\.(jpg|jpeg|png)$/i));

(async () => {
  let totalSaved = 0;
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const tempFile = file + '.tmp' + ext;
    try {
      const stat = fs.statSync(file);
      const originalSize = stat.size;

      const image = sharp(file);
      const metadata = await image.metadata();
      
      let transform = image;
      if (metadata.width > 1200) {
        transform = transform.resize({ width: 1200, withoutEnlargement: true });
      }

      if (ext === '.jpg' || ext === '.jpeg') {
        await transform.jpeg({ quality: 80 }).toFile(tempFile);
      } else if (ext === '.png') {
        await transform.png({ quality: 80, compressionLevel: 8 }).toFile(tempFile);
      }
      
      const newStat = fs.statSync(tempFile);
      const newSize = newStat.size;
      
      if (newSize < originalSize) {
        fs.renameSync(tempFile, file);
        totalSaved += (originalSize - newSize);
        console.log(`Saved ${(originalSize - newSize) / 1024 / 1024} MB on ${file}`);
      } else {
        fs.unlinkSync(tempFile);
      }
    } catch (e) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
  console.log(`Total saved: ${totalSaved / 1024 / 1024} MB`);
})();
