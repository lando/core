const fs = require('fs');
const path = require('path');

const oldPath = path.join(__dirname, 'dist', 'sitemap.xml');
const newPath = path.join(__dirname, 'dist', 'docs-sitemap.xml');

fs.rename(oldPath, newPath, err => {
  if (err) {
    console.error('Error renaming sitemap.xml:', err);
    process.exit(1);
  }
  console.log('sitemap.xml has been renamed to docs-sitemap.xml');
});

// Copy public/sitemap.xml to .vitepress/dist/sitemap.xml
const oldSitemapPath = path.resolve(__dirname, '..', 'public', 'sitemap.xml');
const newSitemapPath = path.resolve(__dirname, 'dist', 'sitemap.xml');

fs.copyFile(oldSitemapPath, newSitemapPath, err => {
  if (err) {
    console.error('Error copying sitemap.xml:', err);
    process.exit(1);
  }
  console.log('sitemap.xml has been copied to .vitepress/dist/sitemap.xml');
});
