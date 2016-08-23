const regl = require('regl')({
  extensions: 'OES_texture_float'
})
const stereo = require('regl-stereo')({regl})
const mat4 = require('gl-mat4')

const WIDTH = 256
const HEIGHT = 256

const rgbTexture = regl.texture({
  shape: [WIDTH, HEIGHT, 3],
  format: 'rgb',
  data: Array(WIDTH * HEIGHT * 3).fill().map(() => 255 * Math.random())
})

const depthTexture = regl.texture({
  shape: [WIDTH, HEIGHT, 1],
  format: 'luminance',
  type: 'float',
  data: Array(WIDTH * HEIGHT).fill(0).map(() => Math.random())
})

const uvData = []
for (let i = 0; i < HEIGHT; ++i) {
  for (let j = 0; j < WIDTH; ++j) {
    uvData.push([j / WIDTH, i / HEIGHT])
  }
}

const drawParticles = regl({
  vert: `
  precision highp float;
  attribute vec2 uv;
  uniform sampler2D depth;
  uniform mat4 projection, view;
  varying vec2 fuv;
  void main () {
    vec3 position = vec3(2.0 * uv - 1.0, texture2D(depth, uv).r);
    fuv = uv;
    gl_PointSize = 2.0;
    gl_Position = projection * view * vec4(position, 1);
  }
  `,

  frag: `
  precision highp float;
  uniform sampler2D color;
  varying vec2 fuv;
  void main () {
    gl_FragColor = vec4(texture2D(color, fuv).rgb, 1);
  }
  `,

  attributes: {
    uv: uvData
  },

  uniforms: {
    color: rgbTexture,
    depth: depthTexture,
    view: mat4.lookAt(
      mat4.create(),
      [0, 0, -2],
      [0, 0, 0],
      [0, 1, 0])
  },

  count: WIDTH * HEIGHT,

  primitive: 'points'
})

regl.frame(() => {
  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1
  })
  stereo({
    separation: 0.1,
    fov: Math.PI / 4.0,
    zNear: 1,
    zFar: 100
  }, () => {
    drawParticles()
  })
})
