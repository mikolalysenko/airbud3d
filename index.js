const regl = require('regl')({
  extensions: 'OES_texture_float'
})
const stereo = require('regl-stereo')({regl})
const mat4 = require('gl-mat4')
const wsock = require('websocket-stream')
const to2 = require('to2')
const lenpre = require('length-prefixed-stream')

const WIDTH = 640
const HEIGHT = 480

const rgbTexture = regl.texture({
  shape: [WIDTH, HEIGHT, 3],
  format: 'rgb',
  data: Array(WIDTH * HEIGHT * 3).fill().map(() => 255 * Math.random())
})

const depthTexture = regl.texture({
  shape: [WIDTH, HEIGHT, 1],
  format: 'luminance',
  type: 'float',
  data: Array(WIDTH * HEIGHT).fill(0)
})

wsock('ws://192.168.1.144:9000')
  .pipe(lenpre.decode())
  .pipe(to2(function (buf, enc, next) {
    if (buf[3] === 0) {
      rgbTexture.subimage(buf.subarray(4))
    } else {
    }
    next()
  }))

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
  uniform float tick;
  varying vec2 fuv;

  vec3 warp (vec3 p) {
    return p;
  }

  void main () {
    vec3 position = warp(vec3(2.0 * vec2(uv.x, 1.0 - uv.y) - 1.0, texture2D(depth, uv).r));
    fuv = uv;
    gl_PointSize = 8.0;
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
      [0, 1, 0]),
    tick: ({tick}) => tick / 60.0
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
    separation: 0.25,
    fov: Math.PI / 4.0,
    zNear: 1,
    zFar: 100
  }, () => {
    drawParticles()
  })
})
