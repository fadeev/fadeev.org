/*
 * Plays a mock session across two Terminal windows: the first starts
 * ZetaChain localnet, the second sends a cross-chain swap to it with
 * `zetachain evm deposit-and-call`, and localnet logs the swap landing on
 * BNB. Commands follow the swap tutorial in the ZetaChain docs, output
 * follows github.com/zeta-chain/localnet and the CLI's own formatting, and
 * the addresses are anvil's deterministic deployment addresses.
 */
const instant = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) =>
  instant ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

const PROMPT = "fadeev@MacBook-Pro ~ % ";
const SIGNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // anvil's first account
const UNIVERSAL = "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB"; // the deployed swap contract
const ZRC20_ETH = "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44";
const ZRC20_BNB = "0x4A679253410272dd5232B3Ff7cF5dbB88f295319";
const TX_HASH = "0x40ec494310adf77dc45ddfbf6911ecba79269088a3c7f063ff377baa80ee7b6a";

// abi.encode(address, bytes, bool): the token to swap to, the recipient, withdraw
const word = (hex) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");
const MESSAGE =
  "0x" + word(ZRC20_BNB) + word("60") + word("1") + word("14") +
  SIGNER.slice(2).toLowerCase().padEnd(64, "0");

const registry = [
  ["Ethereum (11155112)", [
    ["erc20Custody", "0x0B306BF915C4d645ff596e518fAf3F9669b97016"],
    ["gateway", "0x9A676e781A523b5d0C0e43731313A708CB607508"],
    ["zetaConnector", "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1"],
    ["zetaToken", "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82"],
    ["USDC.ETH", "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE"],
  ]],
  ["ZetaChain (31337)", [
    ["gateway", "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"],
    ["uniswapV2Factory", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"],
    ["uniswapV2Router02", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"],
    ["uniswapV3Factory", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"],
    ["uniswapV3Router", "0x0165878A594ca255338adfa4d48449f69242Eb8F"],
    ["zetaToken", "0x5FbDB2315678afecb367f032d93F642f64180aa3"],
    ["ZRC-20 ETH.ETH", ZRC20_ETH],
    ["ZRC-20 USDC.ETH", "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f"],
    ["ZRC-20 BNB.BNB", ZRC20_BNB],
    ["ZRC-20 USDC.BNB", "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F"],
  ]],
  ["BNB (98)", [
    ["erc20Custody", "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c"],
    ["gateway", "0x68B1D87F95878fE05B998F19b66F4baba5De1aed"],
    ["zetaConnector", "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"],
    ["zetaToken", "0x59b670e9fA9D0A427751Af201D676719a970857b"],
    ["USDC.BNB", "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1"],
  ]],
];

function terminal(element) {
  const body = element.querySelector(".terminal-body");
  const title = element.querySelector(".title");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  let line;

  // moves the cursor to a fresh line, scrolling like a terminal once full
  function newLine() {
    line = document.createElement("div");
    line.className = "line";
    line.append(cursor);
    body.append(line);
    body.scrollTop = body.scrollHeight;
  }

  function write(text, className) {
    const node = className
      ? Object.assign(document.createElement("span"), { className, textContent: text })
      : document.createTextNode(text);
    line.insertBefore(node, cursor);
  }

  newLine();

  return {
    element,
    body,
    newLine,
    write,

    // each part is plain text or a [className, text] pair
    print(...parts) {
      for (const part of parts) {
        if (Array.isArray(part)) write(part[1], part[0]);
        else write(part);
      }
      newLine();
    },

    async type(text) {
      for (const char of text) {
        write(char);
        await sleep(40 + Math.random() * 80);
      }
    },

    // the line is redrawn from scratch, as a finished prompt does
    clearLine() {
      line.replaceChildren(cursor);
    },

    // where a full-screen view starts, so it can redraw itself from there
    mark() {
      return line;
    },

    eraseFrom(mark) {
      while (body.lastChild !== mark) body.lastChild.remove();
      line = mark;
      line.replaceChildren(cursor);
    },

    // the title names what's running, as Terminal's does: the shell, or a command
    running(process = "-zsh") {
      title.textContent = `fadeev — ${process} — 80×24`;
    },
  };
}

const localnet = terminal(document.querySelector(".terminal.localnet"));
const cli = terminal(document.querySelector(".terminal.cli"));

function focus(active) {
  for (const term of [localnet, cli]) {
    term.element.classList.toggle("inactive", term !== active);
  }
}

function lastLogin(date, tty) {
  const [weekday, month, , , time] = date.toString().split(" ");
  return `Last login: ${weekday} ${month} ${String(date.getDate()).padStart(2)} ${time} on ${tty}`;
}

// localnet's logger: the chain's name in bold, the whole line in its colour
const CHAINS = {
  localnet: ["LOCALNET", "dim"],
  ethereum: ["Ethereum", "cyan"],
  zetachain: ["ZetaChain", "green"],
  bnb: ["BNB", "yellow"],
};

function log(chain, message) {
  const [name, color] = CHAINS[chain];
  localnet.print([color, "["], [`${color} bold`, name], [color, `] ${message}`]);
}

// the `table` package with "norc" borders, which localnet uses
function table(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  const rule = (left, join, right) =>
    left + widths.map((width) => "─".repeat(width + 2)).join(join) + right;
  const lines = [rule("┌", "┬", "┐")];
  rows.forEach((row, i) => {
    if (i > 0) lines.push(rule("├", "┼", "┤"));
    lines.push("│" + row.map((cell, j) => " " + cell.padEnd(widths[j]) + " ").join("│") + "│");
  });
  lines.push(rule("└", "┴", "┘"));
  return lines;
}

async function startLocalnet() {
  await localnet.type("npx zetachain localnet start");
  await sleep(500);
  localnet.newLine();
  localnet.running("node");

  await sleep(700);
  log("localnet", "Starting anvil on port 8545 with args: -q");
  await sleep(900);
  for (const chain of ["Ton", "Solana", "Bitcoin", "Sui"]) {
    log("localnet", `Skipping ${chain}...`);
    await sleep(30);
  }
  await sleep(300);
  log("localnet", `EVM default wallet address: ${SIGNER}`);
  log("localnet", "EVM default wallet private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  log("localnet", "Default wallet mnemonic: test test test test test test test test test test test junk");

  // deploying the contracts
  await sleep(2500);

  for (const [chain, contracts] of registry) {
    localnet.print();
    localnet.print(chain);
    for (const row of table([["Contract", "Address"], ...contracts])) {
      localnet.print(row);
      await sleep(15);
    }
    localnet.print();
  }
}

async function depositAndCall() {
  // pasted from the docs rather than typed
  cli.write(
    "npx zetachain evm deposit-and-call --rpc http://localhost:8545 " +
    "--chain-id 11155112 --gateway $GATEWAY_ETHEREUM --amount 0.001 " +
    "--types address bytes bool --receiver $UNIVERSAL " +
    "--private-key $PRIVATE_KEY --values $ZRC20_BNB $RECIPIENT true"
  );
  await sleep(700);
  cli.newLine();
  cli.running("node");

  // checking the balance
  await sleep(900);
  cli.print();
  cli.print(`From:   ${SIGNER}`);
  cli.print(`To:     ${UNIVERSAL} on ZetaChain`);
  cli.print("Amount: 0.001 native tokens");
  cli.print(`Refund: ${SIGNER}`);
  cli.print("Call on revert: false");
  cli.print();
  cli.print("Contract call details:");
  cli.print(`Function parameters: ${ZRC20_BNB}, ${SIGNER}, true`);
  cli.print('Parameter types: ["address","bytes","bool"]');
  cli.print();

  cli.write("?", "blue");
  cli.write(" Proceed with the transaction?", "bold");
  cli.write(" (Y/n) ", "dim");
  await sleep(1400);
  cli.clearLine();
  cli.print(["green", "✔"], ["bold", " Proceed with the transaction?"], ["cyan", " Yes"]);

  await sleep(800);
  cli.print(`Transaction hash: ${TX_HASH}`);
  cli.running();
  cli.write(PROMPT);
}

// localnet relays the deposit to the swap contract, which withdraws to BNB
async function relaySwap() {
  await sleep(400);
  log("ethereum", "Gateway: DepositedAndCalled event emitted");
  await sleep(500);
  const context = JSON.stringify({ chainID: "11155112", sender: SIGNER, senderEVM: SIGNER });
  log(
    "zetachain",
    `Universal contract ${UNIVERSAL} executing onCall (context: ${context}), ` +
    `zrc20: ${ZRC20_ETH}, amount: 1000000000000000, message: ${MESSAGE})`
  );
  await sleep(700);
  log("zetachain", "Gateway: 'Withdrawn' event emitted");
  await sleep(600);
  log("bnb", `Transferred 0.000969817443276215 native gas tokens from TSS to ${SIGNER.toLowerCase()}`);
}

const opened = new Date();
localnet.print(lastLogin(new Date(opened - 2 * 36e5), "ttys000"));
localnet.write(PROMPT);

async function play() {
  await sleep(1200);
  await startLocalnet();

  // a second window for commands, as localnet keeps the first one busy
  await sleep(1500);
  cli.element.classList.add("open");
  focus(cli);
  cli.print(lastLogin(opened, "ttys000"));
  cli.write(PROMPT);
  await sleep(1000);
  await depositAndCall();
  await relaySwap();
}

// the laptops scale with the viewport, so keep showing the latest output
addEventListener("resize", () => {
  for (const { body } of [localnet, cli, ignite]) body.scrollTop = body.scrollHeight;
});

// the window opens and the session starts once the laptop's screen is all but fully in view
new IntersectionObserver((entries, observer) => {
  if (!entries.some((entry) => entry.isIntersecting)) return;
  observer.disconnect();
  localnet.element.classList.add("open");
  play();
}, { threshold: 0.95 }).observe(document.querySelector(".laptop .lid"));

/*
 * Ignite's chapter has the wallet from Ignite's Vue template beside a
 * Terminal running Ignite CLI v0.26.1 from January 2023: scaffolding a chain
 * and serving it. The output follows the CLI's source, and alice and bob are
 * throwaway accounts made the way serve makes them.
 */
const ignite = terminal(document.querySelector(".terminal.ignite"));
const PLANET_PROMPT = "fadeev@MacBook-Pro planet % ";
const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
const ACCOUNTS = [
  ["alice", "cosmos1nur4ycuvvr4p0hnnma8rfyjccfxrvqrzk8rcry",
    "talk trip december race pulse illegal jeans banana throw flavor august water jaguar monitor fix conduct across maid faith change slice polar measure fall"],
  ["bob", "cosmos1upzfwer45nys85dw62dhjj6gn33kw5t2l9gat2",
    "time issue clerk chief decade canal symptom hour theory drip grit brain key acid myself crash noodle art dance erode crime toward negative close"],
];

// redraws with the next spinner frame until the time is up
async function spin(draw, ms) {
  for (let frame = 0, end = performance.now() + ms; ; frame++) {
    draw(SPINNER[frame % SPINNER.length]);
    await sleep(80);
    if (instant || performance.now() >= end) return;
  }
}

// breaks between words to fit the width, as Ignite does with mnemonics
function wrap(text, width) {
  const rows = [];
  for (const word of text.split(" ")) {
    const last = rows.length - 1;
    if (last >= 0 && rows[last].length + 1 + word.length <= width) rows[last] += ` ${word}`;
    else rows.push(word);
  }
  return rows;
}

async function scaffoldChain() {
  await ignite.type("ignite scaffold chain planet");
  await sleep(500);
  ignite.newLine();
  ignite.running("ignite");
  await spin((frame) => {
    ignite.clearLine();
    ignite.write(`${frame} Scaffolding...`);
  }, 1800);
  ignite.clearLine();
  ignite.newLine();
  ignite.print("⭐️ Successfully created a new blockchain 'planet'.");
  ignite.print("👉 Get started with the following commands:");
  ignite.print();
  ignite.print(" % cd planet");
  ignite.print(" % ignite chain serve");
  ignite.print();
  ignite.print("Documentation: https://docs.ignite.com");
  ignite.running();
  ignite.write(PROMPT);
}

// serve's views are indented and drawn over the whole window each time
function startView(view, status) {
  ignite.eraseFrom(view);
  ignite.print();
  ignite.print("  Cosmos SDK's version is: ", ["ig-info", "v0.46.7"]);
  ignite.print();
  ignite.print(`  ${status}`);
  ignite.print();
  ignite.print(["dim", "  Press the 'q' key to stop serve"]);
}

function runView(view) {
  ignite.eraseFrom(view);
  ignite.print();
  ignite.print("  Blockchain is running");
  ignite.print();
  ACCOUNTS.forEach(([name, address, mnemonic], i) => {
    if (i > 0) ignite.print();
    ignite.print("  ", ["ig-success", "✔"], " Added account ", ["bold", name], ` with address ${address} and mnemonic:`);
    for (const row of wrap(mnemonic, 80)) ignite.print(["ig-mnemonic", `    ${row}`]);
  });
  ignite.print();
  ignite.print("  🌍 Tendermint node: http://0.0.0.0:26657");
  ignite.print("  🌍 Blockchain API: http://0.0.0.0:1317");
  ignite.print("  🌍 Token faucet: http://0.0.0.0:4500");
  ignite.print();
  ignite.print("  ", ["ig-info", "⋆"], " Data directory: ", ["dim", "/Users/fadeev/.planet"]);
  ignite.print("  ", ["ig-info", "⋆"], " App binary: ", ["dim", "/Users/fadeev/go/bin/planetd"]);
  ignite.print();
  ignite.print(["dim", "  Press the 'q' key to stop serve"]);
}

async function serveChain() {
  await ignite.type("cd planet");
  await sleep(300);
  ignite.newLine();
  ignite.write(PLANET_PROMPT);
  await sleep(900);
  await ignite.type("ignite chain serve");
  await sleep(500);
  ignite.newLine();
  ignite.running("ignite");

  const view = ignite.mark();
  for (const [status, ms] of [
    ["Installing dependencies...", 2200],
    ["Building the blockchain...", 3200],
    ["Initializing the app...", 1400],
  ]) {
    await spin((frame) => startView(view, `${frame} ${status}`), ms);
  }
  runView(view);
}

ignite.print(lastLogin(new Date(Date.now() - 3 * 36e5), "ttys000"));
ignite.write(PROMPT);

/*
 * Once the chain is up, the wallet sends 250 PHOTON to bob, whose address
 * is written with the wallet's spn prefix, and the send tops its history.
 */
const wallet = document.querySelector(".wallet");
const BOB = "spn1upzfwer45nys85dw62dhjj6gn33kw5t2resm9s";

async function sendPhoton() {
  const $ = (selector) => wallet.querySelector(selector);

  // the address is pasted in, and the amount is already 250
  const input = $(".w-input");
  const button = $(".w-button");
  input.classList.add("filled");
  input.textContent = BOB;
  await sleep(500);
  button.classList.add("ready");
  await sleep(900);
  button.classList.replace("ready", "sending");
  await sleep(1500);

  // the history makes room at the top for the new send
  for (const row of wallet.querySelectorAll(".w-tx, .w-month")) {
    const top = parseFloat(row.style.top);
    if (top >= 106) row.style.top = `${top + 53}px`;
  }
  $(".w-transactions").insertAdjacentHTML("beforeend", `
    <div class="w-tx w-new" style="top: 106px">
      <span class="w-tx-icon">↑</span>
      <div><b>Send</b><span>February 2, 3:14 pm</span></div>
      <div class="w-tx-sum"><b>- 250 PHOTON</b><span>to ${BOB.slice(0, 7)}...${BOB.slice(-6)}</span></div>
    </div>`);
  $(".w-asset .w-amount").textContent = "1,000";
  $(".w-send-asset div span").textContent = "1,000 available";
  input.classList.remove("filled");
  input.textContent = "Recipient address";
  button.classList.remove("sending");
}

// the window opens and the session starts once the Terminal is mostly in view
new IntersectionObserver(async (entries, observer) => {
  if (!entries.some((entry) => entry.isIntersecting)) return;
  observer.disconnect();
  ignite.element.classList.add("open");
  await sleep(600);
  await scaffoldChain();
  await sleep(1200);
  await serveChain();
  await sleep(1500);
  await sendPhoton();
}, { threshold: 0.6 }).observe(ignite.element);

const fine = matchMedia("(hover: hover) and (pointer: fine)");

// the shelf scrolls the page, or on a narrow screen the screen-sized body
const narrow = matchMedia("(max-width: 700px)");
const shelfScroller = () => (narrow.matches ? document.body : document.scrollingElement);

/*
 * The shelf scrolls sideways natively. A mouse wheel only turns up and
 * down, so its turns, and up-and-down trackpad swipes, move the shelf
 * sideways too; a notch of the wheel glides rather than jumps.
 */
addEventListener("wheel", (event) => {
  if (document.body.classList.contains("reading")) return;
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  event.preventDefault();
  // a mouse wheel turns in notches of 120; Chrome and Safari report a
  // trackpad's wheelDelta as exactly -3 times its delta instead
  const notch = event.deltaMode === 1 ||
    (event.wheelDeltaY && event.wheelDeltaY % 120 === 0 && event.wheelDeltaY !== -3 * event.deltaY);
  const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
  shelfScroller().scrollBy({ left: delta, behavior: notch ? "smooth" : "instant" });
}, { passive: false });

/*
 * Dragging the shelf with the mouse: the row
 * stays under the cursor, a flick glides on and slows, and dragging past
 * either end stretches like a rubber band and springs back. Trackpads
 * and touch keep the page's native scrolling, and so does a mouse on a
 * device whose main input is touch.
 */
const row = document.querySelector(".chapters");
if (row) {
  const root = document.documentElement;
  let page = shelfScroller(); // what scrolls, taken afresh as each drag starts
  let x = 0; // where the row is, past its ends while stretched
  let velocity = 0; // px per ms
  let drag = null;
  let dragged = false;
  let frame = 0;

  const end = () => page.scrollWidth - page.clientWidth;
  const clamp = (value) => Math.min(Math.max(value, 0), end());

  // how far a pull of `over` px past an end shows, after Apple's rubber
  // band, which never stretches beyond `limit`
  function stretch(over) {
    const limit = 160;
    return Math.sign(over) * (1 - 1 / (Math.abs(over) * 0.55 / limit + 1)) * limit;
  }

  function render() {
    const inside = clamp(x);
    page.scrollLeft = inside;
    const over = x - inside;
    row.style.setProperty("--stretch", over ? `${-stretch(over)}px` : "0px");
  }

  let last = 0;
  function step(now) {
    const elapsed = Math.min(now - (last || now), 32);
    last = now;
    const over = x - clamp(x);
    if (over) {
      // a critically damped spring back to the end
      const stiffness = 0.00015;
      velocity += (-stiffness * over - 2 * Math.sqrt(stiffness) * velocity) * elapsed;
    } else {
      velocity *= 0.95 ** (elapsed / 16);
    }
    x += velocity * elapsed;
    if (Math.abs(velocity) < 0.01 && Math.abs(x - clamp(x)) < 0.5) {
      x = clamp(x);
      velocity = 0;
    }
    render();
    // still gliding, or still stretched past an end
    frame = velocity || x !== clamp(x) ? requestAnimationFrame(step) : (last = 0);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = last = 0;
  }

  addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !fine.matches) return;
    if (document.body.classList.contains("reading")) return;
    stop();
    page = shelfScroller();
    x = page.scrollLeft + (x - clamp(x));
    drag = { pointer: event.clientX, x, time: event.timeStamp, moved: false };
    velocity = 0;
    dragged = false;
  });

  addEventListener("pointermove", (event) => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(event.clientX - drag.pointer) < 4) return;
      drag.moved = true;
      root.setPointerCapture(event.pointerId);
      root.classList.add("dragging");
    }
    const before = x;
    x = drag.x - (event.clientX - drag.pointer);
    const elapsed = event.timeStamp - drag.time;
    if (elapsed > 0) velocity = (x - before) / elapsed;
    drag.time = event.timeStamp;
    render();
  });

  function release(event) {
    if (!drag) return;
    // a drag that came to rest before letting go doesn't glide
    if (event.timeStamp - drag.time > 80) velocity = 0;
    velocity = Math.max(-4, Math.min(4, velocity));
    dragged = drag.moved;
    drag = null;
    root.classList.remove("dragging");
    if (dragged) frame = requestAnimationFrame(step);
  }

  addEventListener("pointerup", release);
  addEventListener("pointercancel", release);
  addEventListener("dragstart", (event) => event.preventDefault());

  // letting go at the end of a drag isn't a click
  addEventListener("click", (event) => {
    if (!dragged) return;
    dragged = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // a glide gives way to the trackpad or the wheel
  addEventListener("wheel", () => {
    if (frame && x === clamp(x)) stop();
  }, { passive: true });
}

/*
 * The iPad-style pointer follows the mouse exactly, appearing once it
 * moves and fading when it leaves the window. Over a link it snaps to it;
 * over something that opens or plays, it says so. It starts once there's
 * a mouse or trackpad, when the page loads or when one is plugged in.
 */
function point() {
  const pointer = document.createElement("div");
  pointer.className = "pointer";
  document.body.append(pointer);
  document.documentElement.classList.add("pointing");

  const snaps = ".home[href], .case-back, .case p a, .contact a, .pill, .case .talks li > a";
  const plays = ".case figure .talk";

  // how wide each label is, for the pill to fit it
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = '500 13px -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif';
  let mode = "free";
  let target = null;
  let x = 0;
  let y = 0;
  let glide = 0;

  function place() {
    if (mode === "snap") {
      const box = target.getBoundingClientRect();
      // a pill becomes the pointer's own shape; anything else gets a soft
      // box a little bigger than it
      const pill = target.classList.contains("pill");
      pointer.style.setProperty("--w", `${box.width + (pill ? 0 : 16)}px`);
      pointer.style.setProperty("--h", `${box.height + (pill ? 0 : 8)}px`);
      pointer.style.setProperty("--r", pill ? `${box.height / 2}px` : "8px");
      pointer.style.translate = `${box.left + box.width / 2}px ${box.top + box.height / 2}px`;
    } else if (mode === "label") {
      const width = Math.ceil(measure.measureText(pointer.dataset.label).width) + 28;
      pointer.style.setProperty("--w", `${width}px`);
      pointer.style.setProperty("--h", "32px");
      pointer.style.setProperty("--r", "16px");
      pointer.style.translate = `${x}px ${y}px`;
    } else {
      pointer.style.setProperty("--w", "24px");
      pointer.style.setProperty("--h", "24px");
      pointer.style.setProperty("--r", "12px");
      // translate, which applies after scale, so pressing shrinks it in place
      pointer.style.translate = `${x}px ${y}px`;
    }
  }

  function aim(next, element) {
    // onto, off or between links, the shape glides there
    if ((next === "snap" || mode === "snap") && (next !== mode || element !== target)) {
      pointer.classList.add("gliding");
      clearTimeout(glide);
      glide = setTimeout(() => pointer.classList.remove("gliding"), 180);
    }
    mode = next;
    target = element;
    pointer.classList.toggle("snapped", next === "snap");
    pointer.classList.toggle("labelled", next === "label");
  }

  // what the pointer is over decides its shape
  function update(under = document.elementFromPoint(x, y)) {
    // mid-transition the browser finds only the page itself under the
    // mouse; the ⓘ never moves, so a pill on it stays there
    if (under === document.documentElement && target?.closest(".info")) under = target;
    const link = under?.closest(snaps);
    const info = under?.closest(".info");
    const play = under?.closest(plays);
    const opens = !document.body.classList.contains("reading") && under?.closest(".device[data-case]");
    // the ⓘ says in words what it opens, or that it closes
    const about = document.getElementById("about").hidden ? "About" : "Close";
    if (link) aim("snap", link);
    else if (info || play || opens) {
      pointer.dataset.label = info ? about : play ? "Play" : "Case study";
      aim("label", info || play || opens);
    } else aim("free", null);
    place();
  }

  addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !fine.matches) return;
    x = event.clientX;
    y = event.clientY;
    update(event.target instanceof Element ? event.target : null);
    pointer.classList.add("shown");
  });

  /*
   * A click can change what's under a pointer that hasn't moved, opening
   * a case study or a video, and so can scrolling; the shape follows
   * straight away rather than on the next move.
   */
  addEventListener("click", () => {
    requestAnimationFrame(() => update());
    setTimeout(() => update(), 700); // once a view transition has settled
  });
  addEventListener("popstate", () => setTimeout(() => update(), 700));
  // the moment a case study or About opens or closes, so the ⓘ's word switches with it
  addEventListener("route", () => update());
  addEventListener("scroll", () => update(), { passive: true });
  document.querySelector(".player").addEventListener("close", () => update());

  document.documentElement.addEventListener("pointerleave", () => pointer.classList.remove("shown"));
  addEventListener("pointerdown", () => pointer.classList.add("pressed"));
  addEventListener("pointerup", () => pointer.classList.remove("pressed"));

  // and when the mouse goes, the pointer goes with it
  fine.addEventListener("change", () => {
    if (!fine.matches) pointer.classList.remove("shown");
  });
}

if (fine.matches) point();
else fine.addEventListener("change", point, { once: true });

/*
 * A product with a case study opens it when clicked. The address becomes
 * the product's own, like fadeev.org/zetachain, so the case study can be
 * linked to, and Back, Esc or the name close it. The product itself
 * moves into the case study, still running, and the browser's view
 * transition morphs it there from the shelf and back. About works the
 * same way, at fadeev.org/about.
 */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
let reading = null; // the open case study, its product, and its place on the shelf
let shelf = 0; // how far the shelf was scrolled, to come back to
let openedHere = false; // whether Back would return to the shelf
const homeLink = document.querySelector(".home");
const info = document.querySelector(".info");
// the shelf's title, the name alone, even when the page loads under a page's own title
const shelfTitle = document.title.split(" · ").pop();

// the page an address names: "zetachain" for /zetachain, "" for the shelf
const pageOf = (path) => decodeURIComponent(path).replace(/^\/+|\/+$/g, "").replace(/\.html$/, "").replace(/^index$/, "");

// links from before the pages had addresses of their own, like /#zetachain,
// whether the page loads from one or is already open
function fromHash() {
  if (!pageOf(location.pathname) && location.hash.length > 1) {
    history.replaceState(null, "", `/${location.hash.slice(1)}`);
  }
}
fromHash();

// and a page's file, like /zetachain.html, at its address
if (location.pathname.endsWith(".html")) {
  history.replaceState(null, "", `/${pageOf(location.pathname)}`);
}

function show(id) {
  const article = document.getElementById(id);
  const device = document.querySelector(`.device[data-case="${id}"]`);
  if (!article?.classList.contains("case") || reading?.article === article) return;
  hide();
  shelf = shelfScroller().scrollLeft;
  // the About page has no product to bring along
  const home = device && document.createComment(" its place on the shelf ");
  if (device) {
    device.before(home);
    article.querySelector(".case-device").append(device);
  }
  article.hidden = false;
  document.body.classList.add("reading");
  homeLink.href = "/";
  info.ariaLabel = id === "about" ? "Close" : "About";
  document.title = `${article.querySelector("h1")?.textContent ?? "About"} · ${shelfTitle}`;
  reading = { article, device, home };
  scrollTo(0, 0);
}

function hide() {
  if (!reading) return;
  const { article, device, home } = reading;
  home?.replaceWith(device);
  article.hidden = true;
  document.body.classList.remove("reading");
  homeLink.removeAttribute("href");
  info.ariaLabel = "About";
  document.title = shelfTitle;
  reading = null;
  scrollTo(0, 0);
  shelfScroller().scrollLeft = shelf;
}

// name only the product that is moving, so the other one stays in the crossfade
function nameDevice(id) {
  for (const device of document.querySelectorAll(".device[data-case]")) {
    device.style.viewTransitionName = device.dataset.case === id ? id : "";
  }
}

function route(animate) {
  let id = pageOf(location.pathname);
  // an address that names no page shows the shelf, at the shelf's address
  if (id && !document.getElementById(id)?.classList.contains("case")) {
    history.replaceState(null, "", "/");
    id = "";
  }
  nameDevice(id || reading?.device?.dataset.case || "");
  const change = () => {
    if (id) show(id);
    else hide();
    dispatchEvent(new Event("route")); // for the pointer, which shows what's under it
  };
  if (animate && document.startViewTransition && !reduceMotion.matches) {
    document.startViewTransition(change);
  } else {
    change();
  }
}

// opens a page from the shelf, giving it its address
function open(id) {
  if (reading) return;
  openedHere = true;
  history.pushState(null, "", `/${id}`);
  route(true);
}

function close() {
  if (!reading) return;
  if (openedHere) {
    openedHere = false;
    history.back();
  } else {
    history.pushState(null, "", `/${location.search}`);
    route(true);
  }
}

// Back and Forward change the address, and so does an old #link
addEventListener("popstate", () => {
  fromHash();
  route(true);
});

for (const device of document.querySelectorAll(".device[data-case]")) {
  device.addEventListener("click", () => open(device.dataset.case));
  device.addEventListener("keydown", (event) => {
    if (event.key === "Enter") open(device.dataset.case);
  });
}

// a modified click opens a link's address in a new tab, as any link's does
const newTab = (event) => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

// the ⓘ opens About like a product opens its case study, and closes it again
info.addEventListener("click", (event) => {
  if (newTab(event)) return;
  event.preventDefault();
  if (reading?.article.id === "about") close();
  else if (reading) {
    // from a case study, About takes its place
    openedHere = true;
    history.pushState(null, "", "/about");
    route(true);
  } else open("about");
});

for (const link of [homeLink, ...document.querySelectorAll(".case-back")]) {
  link.addEventListener("click", (event) => {
    if (!reading || newTab(event)) return;
    event.preventDefault();
    close();
  });
}

addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.querySelector(".player").open) close();
});

route(false);

/*
 * For people who'd rather not have motion, Anuma's recording stays on its
 * first frame, and the first Terminal windows are open from the start
 * rather than opening as their products come into view.
 */
if (instant) {
  for (const video of document.querySelectorAll("video[autoplay]")) {
    video.removeAttribute("autoplay");
    video.pause();
  }
  for (const window of [localnet, ignite]) window.element.classList.add("open");
} else {
  // a case study's recordings load and play only while they're on screen
  const onScreen = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    }
  }, { threshold: 0.25 });
  for (const video of document.querySelectorAll(".case video")) onScreen.observe(video);
}

/*
 * Photos of recorded talks play them in an overlay, from YouTube's
 * privacy-enhanced player, which loads only once a talk is opened. The
 * photo itself grows from its place into the player, leaving its place
 * empty, stands in for the video until the video has loaded, and shrinks
 * back into its place when the player closes.
 */
const player = document.querySelector(".player");
const recording = player.querySelector("iframe");
const flyer = document.createElement("img"); // the photo, while it's on the move
flyer.className = "flyer";
flyer.alt = "";
flyer.hidden = true;
player.append(flyer);
let source = null; // the talk whose photo is in the player

const box = (element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` };
};

// the photo goes from one box to another, cropped the way each box crops it
function flyPhoto(from, to) {
  for (const animation of flyer.getAnimations()) animation.cancel();
  flyer.hidden = false;
  return flyer.animate(
    [
      { ...box(from), borderRadius: getComputedStyle(from).borderRadius },
      { ...box(to), borderRadius: getComputedStyle(to).borderRadius },
    ],
    { duration: 450, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" },
  ).finished;
}

function openTalk(talk) {
  const photo = talk.querySelector("img");
  const loaded = new Promise((resolve) => recording.addEventListener("load", resolve, { once: true }));
  recording.src = `https://www.youtube-nocookie.com/embed/${talk.dataset.video}?autoplay=1&rel=0`;
  player.querySelector("p").textContent = talk.dataset.title;
  player.showModal();
  // a talk in a list has no photo to grow, and it just fades in
  if (!photo || reduceMotion.matches) return;
  source = talk;
  talk.classList.add("away");
  player.classList.add("flying");
  flyer.src = photo.currentSrc || photo.src;
  flyer.style.objectPosition = getComputedStyle(photo).objectPosition;
  const landed = flyPhoto(photo, recording);
  landed.then(() => player.classList.remove("flying"), () => {});
  // once the video has loaded behind it, the photo fades away
  Promise.all([landed, loaded]).then(() => {
    if (source !== talk || player.classList.contains("leaving")) return;
    flyer.animate({ opacity: [1, 0] }, { duration: 250, fill: "forwards" })
      .finished.then(() => { flyer.hidden = true; }, () => {});
  }, () => {});
}

function closeTalk() {
  if (!player.open || player.classList.contains("leaving")) return;
  player.classList.add("leaving");
  recording.removeAttribute("src"); // the sound stops straight away
  const talk = source;
  const photo = talk?.querySelector("img");
  const back = photo ? flyPhoto(recording, photo) : Promise.resolve();
  const faded = new Promise((resolve) => setTimeout(resolve, 300)); // the backdrop's fade
  Promise.all([back, faded]).then(() => {
    player.close();
    player.classList.remove("leaving", "flying");
    talk?.classList.remove("away");
    flyer.hidden = true;
    source = null;
  }, () => {});
}

for (const talk of document.querySelectorAll(".talk")) {
  talk.addEventListener("click", (event) => {
    // a modified click still opens the talk on YouTube, in a new tab
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openTalk(talk);
  });
}

// a click on the dark backdrop closes it too, and so does Esc, both animated
player.addEventListener("click", (event) => {
  if (event.target === player) closeTalk();
});
player.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeTalk();
});
player.querySelector(".close").addEventListener("click", closeTalk);
player.addEventListener("close", () => recording.removeAttribute("src"));
