# fadeev.org

Denis Fadeev's portfolio: a sideways shelf of products, each opening a case study, and an About page behind the ⓘ.

It's plain files with no framework or bundler: `index.html` holds every page, `site.css` and `site.js` the styles and script, and `images/` and `fonts/` the rest.

## Running it

```sh
npm run dev
```

serves the site at http://localhost:8080, reloading on every save. Every address serves `index.html`, which opens the case study or About that the address names.

## Deploying

Netlify hosts the site. On each deploy it runs `node build.js`, which writes a copy of `index.html` for each page (`anuma.html`, `zetachain.html`, `ignite.html`, `about.html`) with that page's own title, description and link preview, and `netlify.toml` serves them at `/anuma` and the rest. The copies aren't kept in the repository.

The link previews are screenshots in `images/preview*.jpg`, 2400 by 1260, retaken by hand when a page's top changes.
