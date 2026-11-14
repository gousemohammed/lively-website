function e(e,t){let n=getComputedStyle(document.documentElement).getPropertyValue(e).trim(),r=/^#([0-9a-f]{6})$/i.exec(n);if(!r)return t;let i=parseInt(r[1],16);return[(i>>16&255)/255,(i>>8&255)/255,(i&255)/255]}var t=(e,t,n)=>e.map((e,r)=>e+(t[r]-e)*n);function n(n){let r=n.querySelector(`.scene__globe`),i=r?.dataset.map,a=r?.getContext(`webgl`,{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!r||!i||!a)return;let o=(e,t)=>{let n=a.createShader(e);return a.shaderSource(n,t),a.compileShader(n),a.getShaderParameter(n,a.COMPILE_STATUS)?n:null},s=o(a.VERTEX_SHADER,`attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`),c=o(a.FRAGMENT_SHADER,`
precision highp float;
uniform vec2 uRes;      // canvas size, device px
uniform vec2 uC;        // planet centre, device px from the top-left
uniform float uR;       // planet radius, device px
uniform float uSpin;    // longitude at the top of the planet, radians
uniform float uT;       // seconds, for clouds and star twinkle
uniform float uTilt;    // axis tilt towards the viewer, radians
uniform float uReady;   // 0 until the map has loaded
uniform sampler2D uMap;
uniform vec3 uSea, uAtmo, uStar;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 d = (px - uC) / uR; d.y = -d.y;
  float r = length(d);
  vec3 col = vec3(0.0); float alpha = 0.0;

  // Stars: sparse single points, brighter towards the top, gently twinkling, hidden behind the planet's glow
  vec2 cell = floor(px / 2.0);
  float h = hash(cell);
  float star = step(0.9982, h) * (0.35 + 0.65 * hash(cell + 7.1)) * (0.75 + 0.25 * sin(uT * 1.3 + h * 300.0));
  star *= smoothstep(1.02, 1.25, r) * (1.0 - smoothstep(0.35, 1.0, px.y / uRes.y));
  col += uStar * star; alpha += star;

  // Atmosphere outside the edge: a thin bright line fading into the sky
  // (computed under the edge too, so the rim blends into it with no dark seam)
  float o = max(r - 1.0, 0.0);
  float glow = exp(-o / 0.016) * 0.6 + exp(-o / 0.07) * 0.28;
  col += uAtmo * glow; alpha += glow;

  if (r < 1.0 && uReady > 0.5) {
    vec3 n = vec3(d, sqrt(1.0 - r * r));                       // view space, z towards the viewer
    float ct = cos(uTilt), st = sin(uTilt);
    vec3 g = vec3(n.x, n.y * ct - n.z * st, n.y * st + n.z * ct); // globe frame (north up, tilted towards us)
    float lat = asin(clamp(g.y, -1.0, 1.0));
    float lon = atan(g.x, g.z) + uSpin;
    vec2 uv = vec2(fract(lon / 6.2831853 + 0.5), 0.5 - lat / 3.1415927);
    vec3 c = texture2D(uMap, uv).rgb;

    // Sea: the map's oceans are a flat navy, so paint a deep sea with gentle variation
    float sea = clamp((c.b - max(c.r, c.g)) * 5.0, 0.0, 1.0) * step(dot(c, vec3(0.33)), 0.45);
    vec3 w = vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
    vec3 seaCol = uSea * (0.65 + 0.35 * fbm(w * 6.0));
    // Land: a little richer, and greener where it's already green (forests and fields), deserts stay sandy
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 land = mix(vec3(lum), c, 1.15);
    float veg = clamp((c.g - c.r) * 6.0, 0.0, 1.0);
    land = mix(land, land * vec3(0.9, 1.14, 0.84), veg);
    c = mix(land, seaCol, sea);

    // Clouds drift slowly over the surface
    float cl = smoothstep(0.52, 0.78, fbm(w * 2.6 + vec3(uT * 0.006, 0.0, uT * 0.004)));
    c = mix(c, vec3(0.94, 0.95, 0.93), cl * 0.75);

    // Sunlight from the upper left, a soft glint on the sea, and the atmosphere thickening towards the edge
    vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    c *= 0.28 + 0.9 * diff;
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 36.0) * sea * (1.0 - cl);
    c += uAtmo * spec * 0.35;
    float fres = pow(1.0 - n.z, 2.2);
    c = mix(c, uAtmo, fres * 0.55);

    float edge = clamp((1.0 - r) * uR / 1.5, 0.0, 1.0);        // anti-aliased rim
    col = mix(col, c, edge); alpha = mix(alpha, 1.0, edge);
  }
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(col * (alpha > 0.0 ? 1.0 : 0.0), alpha);
}`);if(!s||!c)return;let l=a.createProgram();if(a.attachShader(l,s),a.attachShader(l,c),a.linkProgram(l),!a.getProgramParameter(l,a.LINK_STATUS))return;a.useProgram(l),n.classList.add(`has-globe`),a.bindBuffer(a.ARRAY_BUFFER,a.createBuffer()),a.bufferData(a.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),a.STATIC_DRAW);let u=a.getAttribLocation(l,`p`);a.enableVertexAttribArray(u),a.vertexAttribPointer(u,2,a.FLOAT,!1,0,0);let d=e=>a.getUniformLocation(l,e),f=e(`--color-bg-info-strong`,[.15,.3,.5]),p=e(`--color-accent`,[.18,.42,.25]),m=t(e(`--color-bg-info-subtle`,[.85,.9,.95]),e(`--color-text-accent-inverse`,[.56,.82,.63]),.25);a.uniform3fv(d(`uSea`),t(f,p,.22).map(e=>e*.55)),a.uniform3fv(d(`uAtmo`),m),a.uniform3fv(d(`uStar`),e(`--color-text-inverse`,[.96,.94,.9])),a.uniform1f(d(`uTilt`),55*Math.PI/180),a.uniform1f(d(`uReady`),0);let h=matchMedia(`(prefers-reduced-motion: reduce)`).matches,g=78*Math.PI/180,_=1.2*Math.PI/180,v=!1,y=!1,b=0,x=0,S=performance.now();function C(e){let t=Math.min(window.devicePixelRatio||1,1.5),i=Math.round(r.clientWidth*t),o=Math.round(r.clientHeight*t);(r.width!==i||r.height!==o)&&(r.width=i,r.height=o,a.viewport(0,0,i,o));let s=.65*document.documentElement.clientWidth,c=n.getBoundingClientRect(),l=h?0:(1-Math.min(1,Math.max(0,(innerHeight-c.top)/innerHeight)))*.12*2*s,u=(e-S)/1e3;a.uniform2f(d(`uRes`),i,o),a.uniform2f(d(`uC`),c.width/2*t,(.58*c.height+s+l)*t),a.uniform1f(d(`uR`),s*t),a.uniform1f(d(`uSpin`),g-(h?0:u*_)),a.uniform1f(d(`uT`),h?0:u),a.drawArrays(a.TRIANGLE_STRIP,0,4)}function w(e){b=0,y&&(e-x>33&&(x=e,C(e)),h||(b=requestAnimationFrame(w)))}let T=()=>{y&&!b&&(b=requestAnimationFrame(w))};new IntersectionObserver(([e])=>{if(!e?.isIntersecting||v)return;v=!0;let t=new Image;t.decoding=`async`,t.onload=()=>{a.bindTexture(a.TEXTURE_2D,a.createTexture()),a.texImage2D(a.TEXTURE_2D,0,a.RGB,a.RGB,a.UNSIGNED_BYTE,t),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.uniform1f(d(`uReady`),1),r.classList.add(`is-ready`),x=0,C(performance.now()),T()},t.src=i},{rootMargin:`150% 0px`}).observe(n),new IntersectionObserver(([e])=>{y=!!e?.isIntersecting,T()}).observe(n),h&&addEventListener(`resize`,()=>{y&&C(performance.now())})}var r=document.querySelector(`footer.scene`);r&&n(r);