import {
  spawn,
  execFileSync
} from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  statSync
} from "node:fs";
import {
  join
} from "node:path";

const browserPath =
  process.env.UI_CAPTURE_BROWSER;
const baseUrl =
  process.env.UI_CAPTURE_BASE_URL ??
  "http://127.0.0.1:3010";
const email =
  process.env.UI_CAPTURE_EMAIL;
const password =
  process.env.UI_CAPTURE_PASSWORD;
const outputDir =
  process.env.UI_CAPTURE_OUTPUT;
const routesPath =
  process.env.UI_CAPTURE_ROUTES;
const debugPort =
  Number(
    process.env.UI_CAPTURE_DEBUG_PORT ??
    "9333"
  );
const viewportWidth =
  1920;
const viewportHeight =
  1400;
const maxCaptureHeight =
  14000;

function requireValue(
  value,
  name
) {
  if (
    !value ||
    !String(
      value
    ).trim()
  ) {
    throw new Error(
      `Falta ${name}.`
    );
  }

  return String(
    value
  ).trim();
}

requireValue(
  browserPath,
  "UI_CAPTURE_BROWSER"
);
requireValue(
  email,
  "UI_CAPTURE_EMAIL"
);
requireValue(
  password,
  "UI_CAPTURE_PASSWORD"
);
requireValue(
  outputDir,
  "UI_CAPTURE_OUTPUT"
);
requireValue(
  routesPath,
  "UI_CAPTURE_ROUTES"
);

const routes =
  JSON.parse(
    readFileSync(
      routesPath,
      "utf8"
    )
  );

mkdirSync(
  outputDir,
  {
    recursive: true
  }
);

const tempProfile =
  join(
    process.env.UI_CAPTURE_TEMP_ROOT ??
      "C:\\BrailleCRM\\Temp",
    `BIDesign_UICapture_${process.pid}_${Date.now()}`
  );

mkdirSync(
  tempProfile,
  {
    recursive: true
  }
);

const sleep = (
  milliseconds
) =>
  new Promise(
    (
      resolve
    ) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );

async function waitForJson(
  url,
  timeoutMs = 15000
) {
  const deadline =
    Date.now() +
    timeoutMs;

  let lastError;

  while (
    Date.now() <
    deadline
  ) {
    try {
      const response =
        await fetch(
          url
        );

      if (
        response.ok
      ) {
        return await response.json();
      }
    } catch (
      error
    ) {
      lastError =
        error;
    }

    await sleep(
      300
    );
  }

  throw new Error(
    `No respondio ${url}. ${lastError?.message ?? ""}`.trim()
  );
}

function startBrowser() {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${tempProfile}`,
    `--window-size=${viewportWidth},${viewportHeight}`,
    "--force-device-scale-factor=1",
    "about:blank"
  ];

  const child =
    spawn(
      browserPath,
      args,
      {
        detached: false,
        windowsHide: true,
        stdio:
          "ignore"
      }
    );

  child.unref();

  return child;
}

async function getPageTarget() {
  const targets =
    await waitForJson(
      `http://127.0.0.1:${debugPort}/json/list`
    );

  const target =
    targets.find(
      (
        item
      ) =>
        item.type ===
          "page" &&
        item.webSocketDebuggerUrl
    );

  if (
    !target
  ) {
    throw new Error(
      "No se encontro un target CDP tipo page."
    );
  }

  return target;
}

class CdpClient {
  constructor(
    webSocketUrl
  ) {
    this.webSocketUrl =
      webSocketUrl;
    this.socket =
      null;
    this.nextId =
      1;
    this.pending =
      new Map();
  }

  async connect() {
    this.socket =
      new WebSocket(
        this.webSocketUrl
      );

    await new Promise(
      (
        resolve,
        reject
      ) => {
        const timer =
          setTimeout(
            () =>
              reject(
                new Error(
                  "Timeout conectando a CDP."
                )
              ),
            10000
          );

        this.socket.addEventListener(
          "open",
          () => {
            clearTimeout(
              timer
            );
            resolve();
          },
          {
            once: true
          }
        );

        this.socket.addEventListener(
          "error",
          () => {
            clearTimeout(
              timer
            );
            reject(
              new Error(
                "Error conectando WebSocket CDP."
              )
            );
          },
          {
            once: true
          }
        );
      }
    );

    this.socket.addEventListener(
      "message",
      (
        event
      ) => {
        const message =
          JSON.parse(
            String(
              event.data
            )
          );

        if (
          !message.id
        ) {
          return;
        }

        const pending =
          this.pending.get(
            message.id
          );

        if (
          !pending
        ) {
          return;
        }

        this.pending.delete(
          message.id
        );

        if (
          message.error
        ) {
          pending.reject(
            new Error(
              `${pending.method}: ${JSON.stringify(
                message.error
              )}`
            )
          );
          return;
        }

        pending.resolve(
          message.result
        );
      }
    );
  }

  send(
    method,
    params = {}
  ) {
    if (
      !this.socket ||
      this.socket.readyState !==
        WebSocket.OPEN
    ) {
      return Promise.reject(
        new Error(
          "CDP no esta conectado."
        )
      );
    }

    const id =
      this.nextId++;

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const timeout =
          setTimeout(
            () => {
              this.pending.delete(
                id
              );

              reject(
                new Error(
                  `Timeout CDP: ${method}`
                )
              );
            },
            30000
          );

        this.pending.set(
          id,
          {
            method,
            resolve:
              (
                result
              ) => {
                clearTimeout(
                  timeout
                );
                resolve(
                  result
                );
              },
            reject:
              (
                error
              ) => {
                clearTimeout(
                  timeout
                );
                reject(
                  error
                );
              }
          }
        );

        this.socket.send(
          JSON.stringify({
            id,
            method,
            params
          })
        );
      }
    );
  }

  async evaluate(
    expression,
    awaitPromise = false
  ) {
    const result =
      await this.send(
        "Runtime.evaluate",
        {
          expression,
          awaitPromise,
          returnByValue:
            true,
          userGesture:
            true
        }
      );

    if (
      result.exceptionDetails
    ) {
      throw new Error(
        `JavaScript: ${JSON.stringify(
          result.exceptionDetails
        )}`
      );
    }

    return result.result
      ?.value;
  }

  close() {
    try {
      this.socket?.close();
    } catch {}
  }
}

async function waitForReady(
  cdp,
  waitMs
) {
  const deadline =
    Date.now() +
    20000;

  while (
    Date.now() <
    deadline
  ) {
    const ready =
      await cdp.evaluate(
        "document.readyState"
      );

    if (
      ready ===
        "complete" ||
      ready ===
        "interactive"
    ) {
      break;
    }

    await sleep(
      150
    );
  }

  await sleep(
    waitMs
  );
}

async function navigate(
  cdp,
  url,
  waitMs
) {
  await cdp.send(
    "Page.navigate",
    {
      url
    }
  );

  await waitForReady(
    cdp,
    waitMs
  );
}

async function captureFullPage(
  cdp,
  filePath
) {
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    {
      width:
        viewportWidth,
      height:
        viewportHeight,
      deviceScaleFactor:
        1,
      mobile:
        false
    }
  );

  const metrics =
    await cdp.send(
      "Page.getLayoutMetrics"
    );

  const content =
    metrics.cssContentSize ??
    metrics.contentSize ?? {
      width:
        viewportWidth,
      height:
        viewportHeight
    };

  const width =
    Math.max(
      viewportWidth,
      Math.ceil(
        content.width
      )
    );

  const height =
    Math.min(
      maxCaptureHeight,
      Math.max(
        viewportHeight,
        Math.ceil(
          content.height
        )
      )
    );

  const screenshot =
    await cdp.send(
      "Page.captureScreenshot",
      {
        format:
          "png",
        fromSurface:
          true,
        captureBeyondViewport:
          true,
        clip: {
          x: 0,
          y: 0,
          width,
          height,
          scale: 1
        }
      }
    );

  if (
    !screenshot.data
  ) {
    throw new Error(
      `CDP no devolvio imagen para ${filePath}.`
    );
  }

  writeFileSync(
    filePath,
    Buffer.from(
      screenshot.data,
      "base64"
    )
  );

  if (
    !existsSync(
      filePath
    ) ||
    statSync(
      filePath
    ).size <
      5000
  ) {
    throw new Error(
      `Captura invalida: ${filePath}`
    );
  }
}

async function login(
  cdp
) {
  const payload =
    JSON.stringify({
      email,
      password
    });

  const encoded =
    Buffer.from(
      payload,
      "utf8"
    ).toString(
      "base64"
    );

  const result =
    await cdp.evaluate(
      `
(async () => {
  const bytes =
    Uint8Array.from(
      atob(${JSON.stringify(
        encoded
      )}),
      c => c.charCodeAt(0)
    );

  const payload =
    JSON.parse(
      new TextDecoder().decode(
        bytes
      )
    );

  const response =
    await fetch(
      "/api/auth/login",
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        credentials:
          "include",
        body:
          JSON.stringify(
            payload
          )
      }
    );

  return {
    status:
      response.status,
    body:
      await response.text()
  };
})()
      `,
      true
    );

  if (
    !result ||
    result.status <
      200 ||
    result.status >=
      300
  ) {
    throw new Error(
      `Login CRM rechazado. HTTP ${result?.status ?? "?"}.`
    );
  }

  await navigate(
    cdp,
    `${baseUrl}/`,
    1800
  );

  const verification =
    await cdp.evaluate(
      `({
        path:
          location.pathname,
        text:
          (document.body?.innerText ?? "")
            .slice(0,12000)
      })`
    );

  if (
    !verification ||
    verification.path ===
      "/login" ||
    !(
      verification.text.includes(
        "Centro de mando"
      ) ||
      verification.text.includes(
        "Prospectos abiertos"
      )
    )
  ) {
    throw new Error(
      "Login aceptado, pero el Dashboard no quedo autenticado."
    );
  }
}

function galleryHtml(
  items
) {
  const cards =
    items.map(
      (
        item
      ) => `
      <article class="card">
        <h2>${escapeHtml(
          item.name
        )}</h2>
        <p>${escapeHtml(
          item.fileName
        )}</p>
        <a href="${encodeURI(
          item.fileName
        )}" target="_blank" rel="noreferrer">
          <img
            src="${encodeURI(
              item.fileName
            )}"
            alt="${escapeHtml(
              item.name
            )}"
          />
        </a>
      </article>
    `
    ).join(
      "\n"
    );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>BI DESIGN CRM - UI UX V2.3</title>
<style>
*{box-sizing:border-box}
body{font-family:Segoe UI,Arial,sans-serif;background:#f4f7fb;color:#202D36;margin:0;padding:24px}
.hero{background:linear-gradient(135deg,#191E39,#202D36);border-radius:24px;padding:28px;color:#fff}
.hero h1{margin:0;font-size:30px}
.hero p{color:rgba(255,255,255,.72);margin-bottom:0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:22px;margin-top:24px}
.card{background:#fff;border:1px solid #d8e1eb;border-radius:20px;padding:16px;box-shadow:0 14px 35px rgba(25,30,57,.06)}
.card h2{margin:0 0 5px;font-size:18px}
.card p{margin:0 0 14px;color:#6b7787}
img{display:block;width:100%;border:1px solid #e3eaf2;border-radius:14px}
a{text-decoration:none;color:inherit}
</style>
</head>
<body>
<section class="hero">
<h1>BI DESIGN CRM — Capturas UI/UX V2.3</h1>
<p>Captura full-page automatizada con Chrome DevTools Protocol.</p>
</section>
<section class="grid">
${cards}
</section>
</body>
</html>`;
}

function escapeHtml(
  value
) {
  return String(
    value
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function manifestText(
  items
) {
  return [
    "BI DESIGN CRM - UI/UX CAPTURE V2.3",
    "====================================",
    "",
    `Fecha: ${new Date().toLocaleString(
      "es-MX"
    )}`,
    "Modo: Chrome DevTools Protocol / full-page",
    `Viewport base: ${viewportWidth}x${viewportHeight}`,
    `CRM: ${baseUrl}`,
    "",
    ...items.map(
      (
        item
      ) =>
        `${item.name} -> ${item.fileName}`
    )
  ].join(
    "\n"
  );
}

function cleanupBrowser(
  child
) {
  if (
    child?.pid
  ) {
    try {
      execFileSync(
        "taskkill",
        [
          "/PID",
          String(
            child.pid
          ),
          "/T",
          "/F"
        ],
        {
          windowsHide:
            true,
          stdio:
            "ignore"
        }
      );
    } catch {}
  }

  try {
    rmSync(
      tempProfile,
      {
        recursive:
          true,
        force:
          true
      }
    );
  } catch {}
}

let browser;
let cdp;

try {
  console.log(
    "Iniciando Edge/Chrome Headless..."
  );

  browser =
    startBrowser();

  await waitForJson(
    `http://127.0.0.1:${debugPort}/json/version`
  );

  const target =
    await getPageTarget();

  cdp =
    new CdpClient(
      target.webSocketDebuggerUrl
    );

  await cdp.connect();

  await cdp.send(
    "Page.enable"
  );

  await cdp.send(
    "Runtime.enable"
  );

  const gallery =
    [];

  const loginRoute =
    routes.find(
      (
        route
      ) =>
        !route.authenticated
    );

  if (
    loginRoute
  ) {
    console.log(
      "Capturando Login..."
    );

    await navigate(
      cdp,
      `${baseUrl}${loginRoute.path}`,
      loginRoute.waitMs
    );

    const loginFile =
      `${loginRoute.slug}.png`;

    await captureFullPage(
      cdp,
      join(
        outputDir,
        loginFile
      )
    );

    gallery.push({
      name:
        loginRoute.name,
      fileName:
        loginFile
    });
  }

  console.log(
    "Autenticando BI DESIGN CRM..."
  );

  await login(
    cdp
  );

  console.log(
    "Sesion autenticada."
  );

  for (
    const route of
    routes.filter(
      (
        item
      ) =>
        item.authenticated
    )
  ) {
    console.log(
      `Capturando ${route.name}...`
    );

    await navigate(
      cdp,
      `${baseUrl}${route.path}`,
      route.waitMs
    );

    const routeInfo =
      await cdp.evaluate(
        `({
          path:
            location.pathname,
          title:
            document.title
        })`
      );

    if (
      routeInfo?.path ===
      "/login"
    ) {
      throw new Error(
        `La sesion se perdio al abrir ${route.name}.`
      );
    }

    const fileName =
      `${route.slug}.png`;

    await captureFullPage(
      cdp,
      join(
        outputDir,
        fileName
      )
    );

    gallery.push({
      name:
        route.name,
      fileName
    });
  }

  writeFileSync(
    join(
      outputDir,
      "index.html"
    ),
    galleryHtml(
      gallery
    ),
    "utf8"
  );

  writeFileSync(
    join(
      outputDir,
      "MANIFEST.txt"
    ),
    manifestText(
      gallery
    ),
    "utf8"
  );

  console.log(
    `CAPTURE_V2_3_OK screens=${gallery.length}`
  );
} finally {
  cdp?.close();
  cleanupBrowser(
    browser
  );
}
