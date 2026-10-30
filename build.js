/*
 * Writes a copy of index.html for each page the shelf opens, at
 * anuma.html, zetachain.html, ignite.html and about.html, which Netlify
 * serves at /anuma and the rest. Each copy is the same page, which opens
 * its case study or About from the address, but with a title, description
 * and link preview of its own, so a shared link shows that page's card.
 * Netlify runs it on every deploy (see netlify.toml); the copies aren't
 * kept in the repository. Run it with `node build.js`.
 */
const { readFileSync, writeFileSync } = require("fs");

const site = "https://fadeev.org";
const name = "Denis Fadeev";

const pages = {
  anuma: {
    title: "Anuma",
    description: "How Denis Fadeev designs and builds Anuma, multiplayer AI for real life: People Nearby, memory, the things its AI makes, and the SDK under it.",
    alt: "Anuma on two iPhones, in light and dark: its map of people nearby, and a chat with its AI",
  },
  zetachain: {
    title: "ZetaChain",
    description: "How Denis Fadeev led developer experience at ZetaChain: the toolkit, CLI and localnet, the docs and tutorials, and the talks and workshops.",
    alt: "ZetaChain's docs on a laptop, with two terminals running a cross-chain swap",
  },
  ignite: {
    title: "Tendermint",
    description: "Denis Fadeev created Ignite CLI, which dYdX, Celestia, Sei, Wormhole and Dymension were built with, and built and led the team behind it.",
    alt: "Ignite's wallet on a display, with a terminal serving a new chain",
  },
  about: {
    title: "About",
    description: "Denis Fadeev turns new technology into products people can use: Anuma now, and before it Ignite CLI and developer experience at ZetaChain.",
    alt: "Denis Fadeev on stage at ETH Hong Kong, answering into a microphone from an armchair",
  },
};

const html = readFileSync(`${__dirname}/index.html`, "utf8");
const escape = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// swaps one tag's value, failing loudly if the tag has moved or changed
function swap(page, pattern, value) {
  if (!pattern.test(page)) throw new Error(`index.html no longer has ${pattern}`);
  return page.replace(pattern, (_, before, after) => `${before}${value}${after}`);
}

for (const [id, { title, description, alt }] of Object.entries(pages)) {
  const url = `${site}/${id}`;
  let page = html;
  page = swap(page, /(<title>)[^<]*(<\/title>)/, `${title} · ${name}`);
  page = swap(page, /(<meta name="description" content=")[^"]*(")/, escape(description));
  page = swap(page, /(<link rel="canonical" href=")[^"]*(")/, url);
  page = swap(page, /(<meta property="og:url" content=")[^"]*(")/, url);
  page = swap(page, /(<meta property="og:title" content=")[^"]*(")/, `${title} · ${name}`);
  page = swap(page, /(<meta property="og:description" content=")[^"]*(")/, escape(description));
  page = swap(page, /(<meta property="og:image" content=")[^"]*(")/, `${site}/images/preview-${id}.jpg`);
  page = swap(page, /(<meta property="og:image:alt" content=")[^"]*(")/, escape(alt));
  writeFileSync(`${__dirname}/${id}.html`, page);
  console.log(`${id}.html`);
}
