/*
 * The glass in the hero: a lens that follows the pointer and a pill under the dock.
 *
 * The shaders are from Liquid Glass Studio by Charles Yin (MIT licence),
 * https://github.com/iyinchao/liquid-glass-studio at commit f7b28c3.
 * Its licence is in vendor/liquid-glass-studio/LICENSE.
 *
 * What differs from upstream:
 * - The three #include lines are resolved by hand, and the debug views (STEP 0 to 8)
 *   and the helpers only they used are left out. What remains of main() is STEP 9.
 * - mainSDF: shape 1 is a pill at the dock's position, where upstream draws a circle
 *   in the middle of the screen. Shape 2 is still the lens, and they still merge.
 * - The refracting rim has two thicknesses, one for the lens and a thinner one for the
 *   dock, blended where the two merge. Upstream has one thickness for everything.
 * - The drop shadow of fragment-bg.glsl is applied in the main pass, outside the glass
 *   only, because the background is not rendered again for every frame.
 * - MAX_BLUR_RADIUS is 32, not 200.
 * - The fresnel and glare falloffs clamp their base before pow(). Upstream clamps after,
 *   and pow() of a negative base is undefined, so the rim came out different per GPU.
 * - The renderer below replaces GLUtils.ts and react-spring. The background is a 2D
 *   canvas with the hero's own text on it; the blur passes run when it changes.
 *
 * Without WebGL2 this file does nothing and the hero stays as the stylesheet draws it.
 */
(() => {
  const VERTEX = `#version 300 es
in vec4 a_position;
out vec2 v_uv;

void main() {
  v_uv = (a_position.xy + 1.0) * 0.5;
  gl_Position = a_position;
}`;

  // upstream keeps the two directions in two files that differ in this one expression
  const blurShader = (step) => `#version 300 es

precision highp float;

#define MAX_BLUR_RADIUS (32)

in vec2 v_uv;

uniform sampler2D u_prevPassTexture;
uniform vec2 u_resolution;
uniform int u_blurRadius;
uniform float u_blurWeights[MAX_BLUR_RADIUS + 1];

out vec4 fragColor;

void main() {
  vec2 texelSize = 1.0 / u_resolution;
  vec4 color = texture(u_prevPassTexture, v_uv) * u_blurWeights[0];
  for (int i = 1; i <= u_blurRadius; ++i) {
    float w = u_blurWeights[i];
    vec2 offset = vec2(float(i)) * texelSize;
    color += texture(u_prevPassTexture, v_uv + ${step}) * w;
    color += texture(u_prevPassTexture, v_uv - ${step}) * w;
  }
  fragColor = color;
}`;

  const MAIN = `#version 300 es

precision highp float;

#define PI (3.14159265359)

const float N_R = 1.0 - 0.02;
const float N_G = 1.0;
const float N_B = 1.0 + 0.02;

in vec2 v_uv;
uniform sampler2D u_blurredBg;
uniform sampler2D u_bg;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_mouseSpring;
uniform float u_mergeRate;
uniform float u_shapeWidth;
uniform float u_shapeHeight;
uniform float u_shapeRadius;
uniform float u_shapeRoundness;
uniform vec4 u_tint;
uniform float u_refThickness;
uniform float u_refDistance;
uniform float u_refFactor;
uniform float u_refDispersion;
uniform float u_refFresnelRange;
uniform float u_refFresnelFactor;
uniform float u_refFresnelHardness;
uniform float u_glareRange;
uniform float u_glareConvergence;
uniform float u_glareOppositeFactor;
uniform float u_glareFactor;
uniform float u_glareHardness;
uniform float u_glareAngle;
uniform int u_blurEdge;
uniform int u_showShape1;
// not upstream: the dock's pill and the shadow
uniform vec2 u_dock;
uniform vec2 u_dockSize;
uniform float u_dockThickness;
uniform float u_shadowExpand;
uniform float u_shadowFactor;
uniform vec2 u_shadowPosition;

out vec4 fragColor;

// ---- lib/sdf.glsl

float superellipseCornerSDF(vec2 p, float r, float n) {
  p = abs(p);
  float v = pow(pow(p.x, n) + pow(p.y, n), 1.0 / n);
  return v - r;
}

float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {
  p -= center;

  float cr = cornerRadius * u_dpr;

  vec2 d = abs(p) - vec2(width * u_dpr, height * u_dpr) * 0.5;

  float dist;

  if (d.x > -cr && d.y > -cr) {
    vec2 cornerCenter = sign(p) * (vec2(width * u_dpr, height * u_dpr) * 0.5 - vec2(cr));
    vec2 cornerP = p - cornerCenter;
    dist = superellipseCornerSDF(cornerP, cr, n);
  } else {
    dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  return dist;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// not upstream: a pill the size of the dock with round ends, where upstream has sdCircle
float dockSDF(vec2 p1n) {
  return u_showShape1 == 1
    ? roundedRectSDF(
        p1n,
        vec2(0.0),
        u_dockSize.x / u_resolution.y,
        u_dockSize.y / u_resolution.y,
        u_dockSize.y * 0.5 / u_resolution.y,
        2.0
      )
    : 1.0;
}

float lensSDF(vec2 p2n) {
  return roundedRectSDF(
    p2n,
    vec2(0.0),
    u_shapeWidth / u_resolution.y,
    u_shapeHeight / u_resolution.y,
    u_shapeRadius / u_resolution.y,
    u_shapeRoundness
  );
}

float mainSDF(vec2 p1, vec2 p2, vec2 p) {
  vec2 p1n = p1 + p / u_resolution.y;
  vec2 p2n = p2 + p / u_resolution.y;

  return smin(dockSDF(p1n), lensSDF(p2n), u_mergeRate);
}

// not upstream: the rim's thickness at p, which is the dock's or the lens's by the same
// weight smin gives the two shapes
float rimThickness(vec2 p1, vec2 p2, vec2 p) {
  float d1 = dockSDF(p1 + p / u_resolution.y);
  float d2 = lensSDF(p2 + p / u_resolution.y);
  return mix(u_refThickness, u_dockThickness, clamp(0.5 + 0.5 * (d2 - d1) / u_mergeRate, 0.0, 1.0));
}

// ---- lib/math.glsl

float safeAsin(float x) {
  return asin(clamp(x, -1.0, 1.0));
}

// ---- fragment-main.glsl

vec2 getNormal(vec2 p1, vec2 p2, vec2 p) {
  vec2 h = vec2(max(abs(dFdx(p.x)), 0.0001), max(abs(dFdy(p.y)), 0.0001));

  vec2 grad =
    vec2(
      mainSDF(p1, p2, p + vec2(h.x, 0.0)) - mainSDF(p1, p2, p - vec2(h.x, 0.0)),
      mainSDF(p1, p2, p + vec2(0.0, h.y)) - mainSDF(p1, p2, p - vec2(0.0, h.y))
    ) /
    (2.0 * h);

  return grad * 1.414213562 * 1000.0;
}

// ---- lib/color.glsl
// LCH stack from https://github.com/Rachmanin0xFF/GLSL-Color-Functions/blob/main/color-functions.glsl

const vec3 D65_WHITE = vec3(0.95045592705, 1.0, 1.08905775076);
vec3 WHITE = D65_WHITE;
const mat3 RGB_TO_XYZ_M = mat3(
  0.4124, 0.3576, 0.1805,
  0.2126, 0.7152, 0.0722,
  0.0193, 0.1192, 0.9505
);
const mat3 XYZ_TO_XYZ50_M = mat3(
   1.0479298208405488  ,  0.022946793341019088, -0.05019222954313557 ,
   0.029627815688159344,  0.990434484573249   , -0.01707382502938514 ,
  -0.009243058152591178,  0.015055144896577895,  0.7518742899580008
);
const mat3 XYZ_TO_RGB_M = mat3(
   3.2406255, -1.537208 , -0.4986286,
  -0.9689307,  1.8757561,  0.0415175,
   0.0557101, -0.2040211,  1.0569959
);
const mat3 XYZ50_TO_XYZ_M = mat3(
   0.9554734527042182  , -0.023098536874261423,  0.0632593086610217  ,
  -0.028369706963208136,  1.0099954580058226  ,  0.021041398966943008,
   0.012314001688319899, -0.020507696433477912,  1.3303659366080753
);
float UNCOMPAND_SRGB(float a) {
  return a > 0.04045
    ? pow((a + 0.055) / 1.055, 2.4)
    : a / 12.92;
}
float COMPAND_RGB(float a) {
  return a <= 0.0031308
    ? 12.92 * a
    : 1.055 * pow(a, 0.41666666666) - 0.055;
}
vec3 RGB_TO_XYZ(vec3 rgb) {
  return WHITE == D65_WHITE
    ? rgb * RGB_TO_XYZ_M
    : rgb * RGB_TO_XYZ_M * XYZ_TO_XYZ50_M;
}
vec3 SRGB_TO_RGB(vec3 srgb) {
  return vec3(UNCOMPAND_SRGB(srgb.x), UNCOMPAND_SRGB(srgb.y), UNCOMPAND_SRGB(srgb.z));
}
vec3 RGB_TO_SRGB(vec3 rgb) {
  return vec3(COMPAND_RGB(rgb.x), COMPAND_RGB(rgb.y), COMPAND_RGB(rgb.z));
}
vec3 SRGB_TO_XYZ(vec3 srgb) {
  return RGB_TO_XYZ(SRGB_TO_RGB(srgb));
}
float XYZ_TO_LAB_F(float x) {
  return x > 0.00885645167
    ? pow(x, 0.333333333)
    : 7.78703703704 * x + 0.13793103448;
}
vec3 XYZ_TO_LAB(vec3 xyz) {
  vec3 xyz_scaled = xyz / WHITE;
  xyz_scaled = vec3(
    XYZ_TO_LAB_F(xyz_scaled.x),
    XYZ_TO_LAB_F(xyz_scaled.y),
    XYZ_TO_LAB_F(xyz_scaled.z)
  );
  return vec3(
    116.0 * xyz_scaled.y - 16.0,
    500.0 * (xyz_scaled.x - xyz_scaled.y),
    200.0 * (xyz_scaled.y - xyz_scaled.z)
  );
}
vec3 SRGB_TO_LAB(vec3 srgb) {
  return XYZ_TO_LAB(SRGB_TO_XYZ(srgb));
}
vec3 LAB_TO_LCH(vec3 Lab) {
  return vec3(Lab.x, sqrt(dot(Lab.yz, Lab.yz)), atan(Lab.z, Lab.y) * 57.2957795131);
}
vec3 SRGB_TO_LCH(vec3 srgb) {
  return LAB_TO_LCH(SRGB_TO_LAB(srgb));
}
vec3 XYZ_TO_RGB(vec3 xyz) {
  return WHITE == D65_WHITE
    ? xyz * XYZ_TO_RGB_M
    : xyz * XYZ50_TO_XYZ_M * XYZ_TO_RGB_M;
}
vec3 XYZ_TO_SRGB(vec3 xyz) {
  return RGB_TO_SRGB(XYZ_TO_RGB(xyz));
}
float LAB_TO_XYZ_F(float x) {
  return x > 0.206897
    ? x * x * x
    : 0.12841854934 * (x - 0.137931034);
}
vec3 LAB_TO_XYZ(vec3 Lab) {
  float w = (Lab.x + 16.0) / 116.0;
  return WHITE *
  vec3(LAB_TO_XYZ_F(w + Lab.y / 500.0), LAB_TO_XYZ_F(w), LAB_TO_XYZ_F(w - Lab.z / 200.0));
}
vec3 LAB_TO_SRGB(vec3 lab) {
  return XYZ_TO_SRGB(LAB_TO_XYZ(lab));
}
vec3 LCH_TO_LAB(vec3 LCh) {
  return vec3(LCh.x, LCh.y * cos(LCh.z * 0.01745329251), LCh.y * sin(LCh.z * 0.01745329251));
}
vec3 LCH_TO_SRGB(vec3 lch) {
  return LAB_TO_SRGB(LCH_TO_LAB(lch));
}

// ---- fragment-main.glsl, continued

float vec2ToAngle(vec2 v) {
  float angle = atan(v.y, v.x);
  if (angle < 0.0) angle += 2.0 * PI;
  return angle;
}

vec4 getTextureDispersion(
  sampler2D tex1,
  sampler2D tex2,
  float mixRate,
  vec2 offset,
  float factor
) {
  vec4 pixel = vec4(1.0);

  float bgR = texture(tex1, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;
  float bgG = texture(tex1, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;
  float bgB = texture(tex1, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;

  float blurR = texture(tex2, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;
  float blurG = texture(tex2, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;
  float blurB = texture(tex2, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;

  pixel.r = mix(bgR, blurR, mixRate);
  pixel.g = mix(bgG, blurG, mixRate);
  pixel.b = mix(bgB, blurB, mixRate);

  return pixel;
}

void main() {
  vec2 u_resolution1x = u_resolution.xy / u_dpr;
  // center of shape 1 (not upstream: the dock, where upstream has the screen's centre)
  vec2 p1 = (vec2(0, 0) - u_dock) / u_resolution.y;
  // center of shape 2
  vec2 p2 = (vec2(0, 0) - u_mouseSpring) / u_resolution.y;
  // merged shape
  float merged = mainSDF(p1, p2, gl_FragCoord.xy);

  // not upstream: the shadow of fragment-bg.glsl, the same shape set a little lower
  vec2 shadowOffset = u_shadowPosition * u_dpr / u_resolution.y;
  float shadowSDF = mainSDF(p1 + shadowOffset, p2 + shadowOffset, gl_FragCoord.xy);
  float shadow = exp(-1.0 / u_shadowExpand * abs(shadowSDF) * u_resolution1x.y) * 0.6 * u_shadowFactor;
  vec4 bg = vec4(texture(u_bg, v_uv).rgb - vec3(shadow), 1.0);

  float thickness = rimThickness(p1, p2, gl_FragCoord.xy);

  vec4 outColor;
  if (merged < 0.005) {
    float nmerged = -1.0 * (merged * u_resolution1x.y);

    // calculate refraction edge factor:
    float x_R_ratio = 1.0 - nmerged / thickness;
    float thetaI = safeAsin(pow(x_R_ratio, 2.0));
    float thetaT = safeAsin(1.0 / u_refFactor * sin(thetaI));
    float edgeFactor = -1.0 * tan(thetaT - thetaI);
    // Will have value > 0 inside of shape, force normalize here
    if (nmerged >= thickness) {
      edgeFactor = 0.0;
    }

    if (edgeFactor <= 0.0) {
      outColor = texture(u_blurredBg, v_uv);
      outColor = mix(outColor, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);
    } else {
      // height of glass edge
      float edgeH = nmerged / thickness;
      vec2 normal = getNormal(p1, p2, gl_FragCoord.xy);
      vec4 blurredPixel = getTextureDispersion(
        u_bg,
        u_blurredBg,
        u_blurEdge > 0
          ? 1.0
          : edgeH,
        -normal *
          edgeFactor *
          u_refDistance *
          u_dpr *
          vec2(
            u_resolution.y / (u_resolution1x.x * u_dpr), /* resolution independent */
            1.0
          ),
        u_refDispersion
      );

      // basic tint
      outColor = mix(blurredPixel, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);

      // add fresnel
      float fresnelFactor = pow(
        clamp(
          1.0 +
            merged * u_resolution1x.y / 1500.0 * pow(500.0 / u_refFresnelRange, 2.0) +
            u_refFresnelHardness,
          0.0,
          1.0
        ),
        5.0
      );

      vec3 fresnelTintLCH = SRGB_TO_LCH(
        mix(vec3(1.0), vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)
      );
      fresnelTintLCH.x += 20.0 * fresnelFactor * u_refFresnelFactor;
      fresnelTintLCH.x = clamp(fresnelTintLCH.x, 0.0, 100.0);

      outColor = mix(
        outColor,
        vec4(LCH_TO_SRGB(fresnelTintLCH), 1.0),
        fresnelFactor * u_refFresnelFactor * 0.7 * length(normal)
      );

      // add glare
      float glareGeoFactor = pow(
        clamp(
          1.0 +
            merged * u_resolution1x.y / 1500.0 * pow(500.0 / u_glareRange, 2.0) +
            u_glareHardness,
          0.0,
          1.0
        ),
        5.0
      );

      float glareAngle = (vec2ToAngle(normalize(normal)) - PI / 4.0 + u_glareAngle) * 2.0;
      int glareFarside = 0;
      if (
        glareAngle > PI * (2.0 - 0.5) && glareAngle < PI * (4.0 - 0.5) ||
        glareAngle < PI * (0.0 - 0.5)
      ) {
        glareFarside = 1;
      }
      float glareAngleFactor =
        (0.5 + sin(glareAngle) * 0.5) *
        (glareFarside == 1
          ? 1.2 * u_glareOppositeFactor
          : 1.2) *
        u_glareFactor;
      glareAngleFactor = clamp(pow(glareAngleFactor, 0.1 + u_glareConvergence * 2.0), 0.0, 1.0);

      vec3 glareTintLCH = SRGB_TO_LCH(
        mix(blurredPixel.rgb, vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)
      );
      glareTintLCH.x += 150.0 * glareAngleFactor * glareGeoFactor;
      glareTintLCH.y += 30.0 * glareAngleFactor * glareGeoFactor;
      glareTintLCH.x = clamp(glareTintLCH.x, 0.0, 120.0);

      outColor = mix(
        outColor,
        vec4(LCH_TO_SRGB(glareTintLCH), 1.0),
        glareAngleFactor * glareGeoFactor * length(normal)
      );
    }
  } else {
    outColor = bg;
  }

  // smooth
  outColor = mix(outColor, bg, smoothstep(-0.001, 0.001, merged));

  fragColor = outColor;
}`;

  // Controls.tsx's defaults, scaled the way App.tsx scales them, except where noted
  const MATERIAL = {
    u_refFactor: 1.4,
    u_refDispersion: 5, // 7 upstream, which turns small text into rainbows
    u_refFresnelRange: 30,
    u_refFresnelHardness: 0.2,
    u_refFresnelFactor: 0.2,
    u_glareRange: 30,
    u_glareHardness: 0.2,
    u_glareConvergence: 0.5,
    u_glareOppositeFactor: 0.8,
    u_glareFactor: 0.9,
    u_glareAngle: (-45 * Math.PI) / 180,
    u_shapeRoundness: 5,
    u_mergeRate: 0.05,
    u_shadowExpand: 25,
    u_shadowFactor: 0.15,
  };
  const BLUR_RADIUS = 1; // CSS pixels
  const SIZE_FACTOR = 10; // springSizeFactor
  const TENSION = 170; // react-spring's default spring
  const FRICTION = 26;

  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const canvas = hero.querySelector('canvas');
  const dock = document.querySelector('.dock');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let still = motionQuery.matches;
  let active = document.body.dataset.view === 'website';
  let ready = false;
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) return;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function link(fragment) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.bindAttribLocation(program, 0, 'a_position');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  }

  function texture() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  let blurX, blurY, main;
  try {
    blurX = link(blurShader('vec2(offset.x, 0.0)'));
    blurY = link(blurShader('vec2(0.0, offset.y)'));
    main = link(MAIN);
  } catch (error) {
    console.warn('Glass is off, the shaders did not compile:', error);
    return;
  }
  const at = (program, name) => gl.getUniformLocation(program, name);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const sharp = texture();
  const half = texture();
  const blurred = texture();
  const target = gl.createFramebuffer();
  const art = document.createElement('canvas');
  const pen = art.getContext('2d');

  gl.useProgram(main);
  for (const [name, value] of Object.entries(MATERIAL)) gl.uniform1f(at(main, name), value);
  gl.uniform4f(at(main, 'u_tint'), 1, 1, 1, 0);
  gl.uniform2f(at(main, 'u_shadowPosition'), 0, 10);
  gl.uniform1i(at(main, 'u_blurEdge'), 1);
  gl.uniform1i(at(main, 'u_bg'), 0);
  gl.uniform1i(at(main, 'u_blurredBg'), 1);

  let dpr = 1;
  let lens = 200; // side of the lens, CSS pixels
  // CSS pixels from the canvas's top left corner
  const pos = { x: 0, y: 0 };
  const goal = { x: 0, y: 0 };
  const speed = { x: 0, y: 0 };
  let placed = false;
  let last = 0;
  let queued = 0;

  // The hero's text, word by word where the browser laid it out, so the lens has letters to bend.
  function paintText(box) {
    for (const element of hero.querySelectorAll('[data-glass]')) {
      const style = getComputedStyle(element);
      // the canvas font shorthand takes width keywords only, and 150% is the one width used here
      const width = style.fontStretch === '150%' ? 'extra-expanded' : style.fontStretch === '125%' ? 'expanded' : 'normal';
      pen.font = `${style.fontWeight} ${width} ${style.fontSize} ${style.fontFamily}`;
      pen.fillStyle = style.color;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (const word of node.data.matchAll(/\S+/g)) {
          range.setStart(node, word.index);
          range.setEnd(node, word.index + word[0].length);
          const rect = range.getBoundingClientRect();
          const metrics = pen.measureText(word[0]);
          const ascent = metrics.fontBoundingBoxAscent;
          const baseline = rect.top + (rect.height - ascent - metrics.fontBoundingBoxDescent) / 2 + ascent;
          pen.save();
          pen.translate(rect.left - box.left, baseline - box.top);
          // fitted to the laid-out width, in case the canvas picked a different width of the font
          pen.scale(rect.width / metrics.width, 1);
          pen.fillText(word[0], 0, 0);
          pen.restore();
        }
      }
    }
  }

  function pass(program, from, to, width, height, radius, weights) {
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, to, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, from);
    gl.uniform1i(at(program, 'u_prevPassTexture'), 0);
    gl.uniform2f(at(program, 'u_resolution'), width, height);
    gl.uniform1i(at(program, 'u_blurRadius'), radius);
    gl.uniform1fv(at(program, 'u_blurWeights'), weights);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Redraws the background and its blurred copy. Needed when the hero changes size or the fonts arrive.
  function paint() {
    const box = hero.getBoundingClientRect();
    if (!box.width || !box.height) return;
    dpr = Math.min(devicePixelRatio, 2);
    const width = Math.round(box.width * dpr);
    const height = Math.round(box.height * dpr);
    canvas.width = art.width = width;
    canvas.height = art.height = height;
    gl.viewport(0, 0, width, height);

    pen.fillStyle = getComputedStyle(hero).backgroundColor;
    pen.fillRect(0, 0, width, height);
    pen.scale(dpr, dpr);
    paintText(box);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sharp);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);
    for (const tex of [half, blurred]) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    // computeGaussianKernelByRadius from upstream's utils
    const radius = Math.min(32, Math.max(1, Math.round(BLUR_RADIUS * dpr)));
    const sigma = radius / 3;
    const weights = new Float32Array(33);
    let sum = 0;
    for (let i = 0; i <= radius; i++) {
      weights[i] = Math.exp((-0.5 * i * i) / (sigma * sigma));
      sum += i ? weights[i] * 2 : weights[i];
    }
    for (let i = 0; i <= radius; i++) weights[i] /= sum;
    pass(blurX, sharp, half, width, height, radius, weights);
    pass(blurY, half, blurred, width, height, radius, weights);

    lens = Math.max(110, Math.min(210, box.width * 0.26));
    if (!placed) {
      placed = true;
      const dockBox = dock.getBoundingClientRect();
      // the letters themselves: the h1's own box runs the full width of the hero
      const letters = document.createRange();
      letters.selectNodeContents(hero.querySelector('h1'));
      const name = letters.getBoundingClientRect();
      // rests on the end of the name; when motion is allowed it starts inside the dock and glides there
      goal.x = Math.min(name.right, box.right - lens * 0.7) - box.left;
      goal.y = name.bottom - lens * 0.55 - box.top;
      pos.x = still ? goal.x : dockBox.left + dockBox.width / 2 - box.left;
      pos.y = still ? goal.y : dockBox.top + dockBox.height / 2 - box.top;
    }
  }

  function draw() {
    const box = hero.getBoundingClientRect();
    const dockBox = dock.getBoundingClientRect();
    // upstream measures the spring's speed in device pixels per millisecond
    const stretch = (v) => lens + (Math.abs(v) * dpr * lens * SIZE_FACTOR) / 100000;
    const width = stretch(speed.x);
    const height = stretch(speed.y);

    gl.useProgram(main);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sharp);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blurred);
    gl.uniform2f(at(main, 'u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(at(main, 'u_dpr'), dpr);
    gl.uniform2f(at(main, 'u_mouseSpring'), pos.x * dpr, (box.height - pos.y) * dpr);
    gl.uniform1f(at(main, 'u_shapeWidth'), width);
    gl.uniform1f(at(main, 'u_shapeHeight'), height);
    gl.uniform1f(at(main, 'u_shapeRadius'), (Math.min(width, height) / 2) * 0.8);
    // upstream's 200 pixel shape has a 20 pixel rim that shifts the picture by 0.05; these
    // keep a thicker rim in proportion to the lens, so a small lens on a phone bends as much
    gl.uniform1f(at(main, 'u_refThickness'), lens * 0.21);
    gl.uniform1f(at(main, 'u_refDistance'), lens / 4200);
    gl.uniform1f(at(main, 'u_dockThickness'), dockBox.height * 0.25);
    gl.uniform2f(
      at(main, 'u_dock'),
      (dockBox.left + dockBox.width / 2 - box.left) * dpr,
      (box.bottom - dockBox.top - dockBox.height / 2) * dpr,
    );
    gl.uniform2f(at(main, 'u_dockSize'), dockBox.width, dockBox.height);
    gl.uniform1i(at(main, 'u_showShape1'), root.classList.contains('scrolled') ? 0 : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now) {
    queued = 0;
    if (!active || document.hidden) { last = 0; return; }
    const dt = Math.min((now - (last || now)) / 1000, 1 / 30);
    last = now;
    let moving = false;
    for (const axis of ['x', 'y']) {
      speed[axis] += ((goal[axis] - pos[axis]) * TENSION - speed[axis] * FRICTION) * dt;
      pos[axis] += speed[axis] * dt;
      if (Math.abs(speed[axis]) > 1 || Math.abs(goal[axis] - pos[axis]) > 0.25) moving = true;
    }
    draw();
    if (moving) request();
    else last = 0;
  }

  function request() {
    if (active && ready && !document.hidden) queued ||= requestAnimationFrame(frame);
  }

  function follow(event) {
    if (still || !active) return;
    const box = hero.getBoundingClientRect();
    goal.x = event.clientX - box.left;
    goal.y = event.clientY - box.top;
    request();
  }

  // The dock stays put while the canvas scrolls away under it, so past the first few pixels
  // the stylesheet's glass takes over (see .scrolled in index.html).
  function scrolled() {
    root.classList.toggle('scrolled', scrollY > 8 || dock.getBoundingClientRect().bottom > hero.getBoundingClientRect().bottom);
    if (scrollY < hero.offsetHeight) request();
  }

  window.Glass = {
    pause() { active = false; cancelAnimationFrame(queued); queued = 0; last = 0; },
    resume() {
      active = true;
      if (ready && !gl.isContextLost()) { paint(); scrolled(); draw(); root.classList.add('glass-on'); }
    }
  };
  motionQuery.addEventListener('change', () => {
    still = motionQuery.matches;
    if (still) { pos.x = goal.x; pos.y = goal.y; speed.x = speed.y = 0; }
    request();
  });
  document.fonts.ready.then(() => {
    ready = true;
    if (active) paint();
    scrolled();
    draw();
    // only now, so the stylesheet's hero is never hidden behind an empty canvas
    if (active) root.classList.add('glass-on');
    addEventListener('scroll', scrolled, { passive: true });
    new ResizeObserver(() => {
      if (active && !gl.isContextLost()) { paint(); request(); }
    }).observe(hero);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); root.classList.remove('glass-on'); window.Glass.pause(); });
    hero.addEventListener('pointermove', follow);
    hero.addEventListener('pointerdown', follow);
  });
})();
