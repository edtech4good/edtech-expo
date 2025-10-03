const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
// you can pass the parameter in the command line. e.g. node static_server.js 3000
const port = process.argv[2] || 9000;

// maps file extention to MIME types
// full list can be found here: https://www.freeformatter.com/mime-types-list.html
const mimeType = {
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.doc': 'application/msword',
  '.eot': 'application/vnd.ms-fontobject',
  '.ttf': 'application/x-font-ttf',
};

http
  .createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);
    const range = req.headers.range;
    console.log('Ranges: ', range);

    // parse URL
    const parsedUrl = url.parse(req.url);

    // extract URL path
    // Avoid https://en.wikipedia.org/wiki/Directory_traversal_attack
    // e.g curl --path-as-is http://localhost:9000/../fileInDanger.txt
    // by limiting the path to current directory only
    const sanitizePath = path
      .normalize(parsedUrl.pathname)
      .replace(/^(\.\.[\/\\])+/, '');
    let pathname = path.join(__dirname, sanitizePath);

    // Security check - ensure requests are for allowed resource paths
    // Replace 'your-resource-path' with your actual resource path identifier
    if (!pathname.includes('your-resource-path')) {
      res.statusCode = 404;
      res.end(`Resource not found`);
      return;
    }

    // console.log('FILE PATH: ', decodeURIComponent(pathname));

    const decoded = decodeURIComponent(pathname);

    fs.exists(decodeURIComponent(decoded), function (exist) {
      if (!exist) {
        // if the file is not found, return 404
        res.statusCode = 404;
        res.end(`File ${decoded} not found!`);
        return;
      }

      // if is a directory, then look for index.html
      if (fs.statSync(decoded).isDirectory()) {
        decoded += '/index.html';
      }

      // read file from file system
      fs.readFile(decoded, function (err, data) {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          // based on the URL path, extract the file extention. e.g. .js, .doc, ...
          const ext = path.parse(decoded).ext;

          if (ext === '.mp4') {
            let range = req.headers.range;
            if (!range) {
              range = 'bytes=0-';
            }
            // const videoPath = `your-resource-path/${name}`;
            const videoSize = fs.statSync(decoded).size;
            const CHUNK_SIZE = 10 ** 6;
            const start = Number(range.replace(/\D/g, ''));
            const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
            const contentLength = end - start + 1;

            const headers = {
              'Content-Range': `bytes ${start}-${end}/${videoSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': contentLength,
              'Content-Type': 'video/mp4',
            };
            res.writeHead(206, headers);
            const videoStream = fs.createReadStream(decoded, { start, end });
            videoStream.pipe(res);
          } else {
            res.setHeader('Content-type', mimeType[ext] || 'text/plain');
            res.end(data);
          }

          // Create range header
          // if (range) {
          //   const videoSize = fs.statSync(pathname).size;
          //   const parts = range.replace(/bytes=/, '').split('-');
          //   const start = parseInt(parts[0], 10);
          //   const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
          //   const chunkSize = end - start + 1;

          //   // based on the URL path, extract the file extention. e.g. .js, .doc, ...
          //   const ext = path.parse(pathname).ext;
          //   // if the file is found, set Content-type and send data
          //   res.setHeader('Content-type', mimeType[ext] || 'text/plain');
          //   res.setHeader(
          //     'Content-Range',
          //     `bytes ${start}-${end}/${videoSize}`,
          //   );
          //   res.setHeader('Accept-Ranges', 'bytes');
          //   res.setHeader('Content-Length', chunkSize);
          //   fs.createReadStream(pathname, { start, end }).pipe(res);
          // } else {
          //   // if the file is found, set Content-type and send data
          //   res.setHeader('Content-type', mimeType[ext] || 'text/plain');
          //   res.end(data);
          // }
        }
      });
    });
  })
  .listen(parseInt(port));

console.log(`Server listening on port ${port}`);
