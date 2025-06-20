import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { dirname } from "path";
import slugify from "slugify";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read data from file and add slugs
const data = fs.readFileSync(path.join(__dirname, "data.json"), "utf-8");
const dataObj = JSON.parse(data).map(article => ({
  ...article,
  slug: slugify(article.articleTitle, {
    lower: true,
    strict: true,
    locale: 'hr'
  })
}));

// Read templates
const tempOverview = fs.readFileSync(path.join(__dirname, "templates", "overview.html"), "utf-8");
const tempCard = fs.readFileSync(path.join(__dirname, "templates", "card.html"), "utf-8");
const tempProduct = fs.readFileSync(path.join(__dirname, "templates", "product.html"), "utf-8");

// Replace template placeholders with actual data
const replaceTemplate = (temp, article) => {
  let output = temp.replace(/{%PRODUCTNAME%}/g, article.articleTitle)
      .replace(/{%IMAGE%}/g, article.image)
      .replace(/{%FROM%}/g, article.author)
      .replace(/{%SPECIFICATIONS%}/g, article.summary)
      .replace(/{%QUANTITY%}/g, article.readingTime)
      .replace(/{%ENERGY_SAVINGS%}/g, article.energySavings)
      .replace(/{%DESCRIPTION%}/g, article.content)
      .replace(/{%ID%}/g, article.id)
      .replace(/{%SLUG%}/g, article.slug);

  if (!article.featured) output = output.replace(/{%NOT_ECO%}/g, "not-featured");
  else output = output.replace(/{%NOT_ECO%}/g, "");

  return output;
};

// Create server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const query = Object.fromEntries(url.searchParams);

  // Overview page
  if (pathname === "/" || pathname === "/overview") {
    res.writeHead(200, { "Content-type": "text/html" });
    const cardsHtml = dataObj.map((el) => replaceTemplate(tempCard, el)).join("");
    const output = tempOverview.replace("{%PRODUCT_CARDS%}", cardsHtml);
    res.end(output);

    // Product page by slug
  } else if (pathname.startsWith('/product/')) {
    const slug = pathname.split('/')[2];
    const product = dataObj.find(el => el.slug === slug);

    if (product) {
      res.writeHead(200, { 'Content-type': 'text/html' });
      const output = replaceTemplate(tempProduct, product);
      res.end(output);
    } else {
      res.writeHead(404, { 'Content-type': 'text/html' });
      res.end('<h1>Article not found!</h1>');
    }

    // Redirect from old URL format (/product?id=X) to new slug format
  } else if (pathname === '/product' && query.id) {
    const product = dataObj[query.id];
    if (product) {
      res.writeHead(301, {
        Location: `/product/${product.slug}`,
        'Cache-Control': 'max-age=3600'
      });
      res.end();
    } else {
      res.writeHead(404, { 'Content-type': 'text/html' });
      res.end('<h1>Article not found!</h1>');
    }

    // API endpoint
  } else if (pathname === "/api") {
    res.writeHead(200, {
      "Content-type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify(dataObj));

    // Sitemap.xml
  } else if (pathname === '/sitemap.xml') {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${dataObj.map(article =>
        `<url>
            <loc>http://${req.headers.host}/product/${article.slug}</loc>
            <lastmod>${new Date().toISOString()}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
          </url>`
    ).join('')}
      </urlset>`;

    res.writeHead(200, { 'Content-type': 'application/xml' });
    res.end(sitemap);

    // Images
  } else if (pathname.startsWith('/images/') && pathname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    const imagePath = path.join(__dirname, pathname);

    fs.readFile(imagePath, (err, data) => {
      if (err) {
        console.error('Error loading image:', err);
        res.writeHead(404, { "Content-type": "text/html" });
        res.end("<h1>Image not found!</h1>");
      } else {
        const ext = path.extname(pathname).toLowerCase().substring(1);
        res.writeHead(200, {
          "Content-type": `image/${ext}`,
          "Cache-Control": "public, max-age=31536000"
        });
        res.end(data);
      }
    });

    // Not found
  } else {
    res.writeHead(404, {
      "Content-type": "text/html",
    });
    res.end("<h1>Page not found!</h1>");
  }
});

// Start server
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`Listening to requests on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser`);
});