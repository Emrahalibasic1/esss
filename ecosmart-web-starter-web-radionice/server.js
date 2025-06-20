import http from "http"
import fs from "fs"
import { fileURLToPath } from "url"
import path from "path"
import { dirname } from "path"

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read data from file
const data = fs.readFileSync(path.join(__dirname, "data.json"), "utf-8")
const dataObj = JSON.parse(data)

// Read templates
const tempOverview = fs.readFileSync(path.join(__dirname, "templates", "overview.html"), "utf-8")
const tempCard = fs.readFileSync(path.join(__dirname, "templates", "card.html"), "utf-8")
const tempProduct = fs.readFileSync(path.join(__dirname, "templates", "product.html"), "utf-8")

// Replace template placeholders with actual data
const replaceTemplate = (temp, product) => {
  let output = temp.replace(/{%PRODUCTNAME%}/g, product.productName)
  output = output.replace(/{%IMAGE%}/g, product.image)
  output = output.replace(/{%PRICE%}/g, product.price)
  output = output.replace(/{%FROM%}/g, product.from)
  output = output.replace(/{%ENERGY_SAVINGS%}/g, product.energySavings)
  output = output.replace(/{%SPECIFICATIONS%}/g, product.specifications)
  output = output.replace(/{%QUANTITY%}/g, product.quantity)
  output = output.replace(/{%DESCRIPTION%}/g, product.description)
  output = output.replace(/{%ID%}/g, product.id)

  if (!product.eco) output = output.replace(/{%NOT_ECO%}/g, "not-eco")
  else output = output.replace(/{%NOT_ECO%}/g, "")

  return output
}

// Create server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname
  const query = Object.fromEntries(url.searchParams)

  // Overview page
  if (pathname === "/" || pathname === "/overview") {
    res.writeHead(200, { "Content-type": "text/html" })

    const cardsHtml = dataObj.map((el) => replaceTemplate(tempCard, el)).join("")
    const output = tempOverview.replace("{%PRODUCT_CARDS%}", cardsHtml)

    res.end(output)

    // Product page
  } else if (pathname === "/product") {
    res.writeHead(200, { "Content-type": "text/html" })
    const product = dataObj[query.id]
    const output = replaceTemplate(tempProduct, product)

    res.end(output)

    // API
  } else if (pathname === "/api") {
    res.writeHead(200, { "Content-type": "application/json" })
    res.end(data)

    // Images
  } else if (pathname.match(/\.(jpg|jpeg|png|gif)$/)) {
    const imagePath = path.join(__dirname, pathname)

    fs.readFile(imagePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-type": "text/html" })
        res.end("<h1>Image not found!</h1>")
      } else {
        const ext = path.extname(pathname).slice(1)
        res.writeHead(200, { "Content-type": `image/${ext}` })
        res.end(data)
      }
    })

    // Not found
  } else {
    res.writeHead(404, {
      "Content-type": "text/html",
    })
    res.end("<h1>Page not found!</h1>")
  }
})

// Start server
const port = process.env.PORT || 8000
server.listen(port, () => {
  console.log(`Listening to requests on port ${port}`)
  console.log(`Open http://localhost:${port} in your browser`)
})
