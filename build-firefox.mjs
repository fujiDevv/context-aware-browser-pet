import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));

if (manifest.background && manifest.background.service_worker) {
  manifest.background.scripts = [manifest.background.service_worker];
  delete manifest.background.service_worker;
}

if (manifest.permissions) {
  manifest.permissions = manifest.permissions.filter(p => p !== 'offscreen');
}

if (manifest.content_security_policy && manifest.content_security_policy.extension_pages) {
  manifest.content_security_policy.extension_pages = "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://storage.ko-fi.com";
}

delete manifest.cross_origin_embedder_policy;
delete manifest.cross_origin_opener_policy;

if (manifest.web_accessible_resources) {
  manifest.web_accessible_resources.forEach((resource) => {
    delete resource.use_dynamic_url;
  });
}

manifest.browser_specific_settings = {
  gecko: {
    strict_min_version: "121.0"
  }
};

fs.mkdirSync('dist-firefox', { recursive: true });
fs.cpSync('dist', 'dist-firefox', { recursive: true });
fs.writeFileSync('dist-firefox/manifest.json', JSON.stringify(manifest, null, 2));
console.log('Successfully built dist-firefox/manifest.json');
