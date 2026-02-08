module.exports.setup = async () => ({
  cacheFolder: '.antelope/cache',
  modules: {
    local: {
      source: {
        type: 'local',
        path: '.',
      },
      config: {
        useMock: true,
      },
    },
  },
});

module.exports.cleanup = async () => {};
