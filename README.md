# fadeev.org

Denis Fadeev's portfolio: a sideways shelf of products, each opening a case study, and an About page behind the ⓘ.

It's a static site: `index.html` holds every page, `site.css` and `site.js` the styles and interactions, and `images/` and `fonts/` the rest.

## Running it

```sh
npm install
npm run dev
```

serves the site at http://localhost:8080, reloading on every save. Every address serves `index.html`, which opens the case study or About that the address names.

## Deploying

The shelf shows WebP renders of the iPhone and Pro Display XDR. The Anuma and Tendermint case studies load the corresponding meshopt-compressed GLBs in `devices/`, with the existing videos and wallet over their screens.

The ZetaChain laptop uses Three.js and the GLB in `laptop-3d/`. The build bundles its browser modules with esbuild. After editing those modules, run `node build.js` to refresh the bundles.

Netlify hosts the site. On each deploy it runs `node build.js`, which writes a copy of `index.html` for each page (`anuma.html`, `zetachain.html`, `ignite.html`, `about.html`) with that page's own title, description and link preview, and `netlify.toml` serves them at `/anuma` and the rest. The copies aren't kept in the repository.

The link previews are screenshots in `images/preview*.jpg`, 2400 by 1260, retaken by hand when a page's top changes.
