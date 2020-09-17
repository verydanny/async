module.exports = function (api) {
  api.cache(false)

  return {
    presets: [['@torpedus/babel-preset/node', { typescript: true }]]
  }
}
