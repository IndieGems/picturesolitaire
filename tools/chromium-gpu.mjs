// Launch options for every headless Chromium a tool of this project drives, so
// it draws on the machine's GPU. Import from any script that launches one.
//
// Headless Chromium renders WebGL on SwiftShader by default: a software
// rasteriser on the CPU, which is the box's bottleneck once several agents test
// a game at once. `--enable-gpu` (Chromium 112 and later) lifts that, and the
// ANGLE backend below is the one each OS draws with. Measured on a Windows
// desk (2026-10-13): the same headless launch reported the NVIDIA card instead
// of SwiftShader.
//
//   import { launchOnGpu } from './chromium-gpu.mjs';
//   const browser = await launchOnGpu(chromium);          // logs the renderer
//
//   import { gpuLaunch, rendererOf } from './chromium-gpu.mjs';
//   const browser = await chromium.launch(gpuLaunch());   // options only
//
//   import { softwareLaunch } from './chromium-gpu.mjs';
//   const browser = await chromium.launch(softwareLaunch()); // SwiftShader, on purpose
//
// Works with Playwright and Puppeteer alike (both take `{ headless, args }`);
// a tool driving Chrome over the DevTools Protocol itself passes `GPU_ARGS`
// on the command line. `CHROMIUM_ANGLE=<backend>` overrides the backend for a
// machine whose driver wants another (`gl`, `vulkan`, `metal`, `d3d11`,
// `swiftshader`).
//
// When SwiftShader is the right choice: a golden-image or byte-for-byte
// screenshot comparison, because GPU output differs between machines and
// drivers while SwiftShader's is the same everywhere. Everything else — play,
// perf, a screenshot a person looks at — renders on the GPU. And when a GPU
// render looks wrong, render it once on SwiftShader: the same picture means a
// game bug, a different one a driver artifact, which is a real finding about
// players on that hardware rather than something to discard.
//
// Several GPU browsers at once share the one card: keep them to a handful.
//
// gem-chromium-gpu: 2. The project doctor (`gemctl project doctor --fix`, the
// Editor's Fix) writes the toolset's current copy over this file when that
// number is behind, so keep changes of your own out of it; a machine whose
// driver wants another backend sets CHROMIUM_ANGLE.

/** The ANGLE backend this OS draws with, unless `CHROMIUM_ANGLE` says otherwise. */
export const ANGLE_BACKEND =
  process.env.CHROMIUM_ANGLE ||
  { win32: 'd3d11', darwin: 'metal' }[process.platform] ||
  'vulkan';

/** Command-line arguments that put headless Chromium on the GPU. */
export const GPU_ARGS = [
  '--enable-gpu',
  '--use-gl=angle',
  `--use-angle=${ANGLE_BACKEND}`,
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
  // Vulkan is the one backend Chromium also needs told about as a feature;
  // on the others the flag is inert.
  ...(ANGLE_BACKEND === 'vulkan' ? ['--enable-features=Vulkan'] : []),
];

/** `chromium.launch(gpuLaunch())`: headless on the GPU. Extra options override. */
export function gpuLaunch(extra = {}) {
  return { headless: true, ...extra, args: [...GPU_ARGS, ...(extra.args ?? [])] };
}

/** Command-line arguments that put Chromium on SwiftShader, headed or headless. */
export const SOFTWARE_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  // Chromium 137 and later refuse SwiftShader WebGL in a headed window
  // without this; headless always allowed it.
  '--enable-unsafe-swiftshader',
];

/**
 * `chromium.launch(softwareLaunch())`: headless on SwiftShader, deliberately —
 * for a pixel-identical comparison, or to tell a driver artifact from a game
 * bug. Slow by design; never the default for play or perf.
 */
export function softwareLaunch(extra = {}) {
  return { headless: true, ...extra, args: [...SOFTWARE_ARGS, ...(extra.args ?? [])] };
}

/** The unmasked WebGL renderer string of a page, or null without WebGL. */
export async function rendererOf(page) {
  return page.evaluate(() => {
    // A throwaway context on a canvas nothing keeps: a probe, which the
    // project doctor's screenshot check knows not to read as the game's
    // renderer. Released at once, so asking on the game's own page costs it
    // nothing against the browser's context cap.
    const gl =
      document.createElement('canvas').getContext('webgl2') ||
      document.createElement('canvas').getContext('webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return renderer;
  });
}

/** Whether a renderer string names a software rasteriser rather than a GPU. */
export function isSoftwareRenderer(renderer) {
  return !renderer || /swiftshader|llvmpipe|softpipe|basic render driver|software/i.test(renderer);
}

/**
 * Launch `chromium` (Playwright's or Puppeteer's) headless on the GPU, and log
 * what drew WebGL: `[chromium-gpu] WebGL renderer: ...`, with a warning when it
 * is software after all. Returns the browser; `browser.gpuRenderer` is the
 * string, for a tool that records it with its results.
 */
export async function launchOnGpu(chromium, extra = {}, log = console.error) {
  const browser = await chromium.launch(gpuLaunch(extra));
  const page = await browser.newPage();
  let renderer;
  try {
    renderer = await rendererOf(page);
  } finally {
    await page.close();
  }
  browser.gpuRenderer = renderer;
  log(`[chromium-gpu] WebGL renderer: ${renderer ?? 'none (no WebGL)'}`);
  if (isSoftwareRenderer(renderer)) {
    log(
      `[chromium-gpu] warning: that is software rendering; the GPU was not reached ` +
        `(backend ${ANGLE_BACKEND}; CHROMIUM_ANGLE=<backend> tries another)`,
    );
  }
  return browser;
}
