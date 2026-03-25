# Changelog

## v1.0.1

[compare changes](https://github.com/AntelopeJS/redis/compare/v1.0.0...v1.0.1)

### 🩹 Fixes

- Move ioredis-mock to dependencies for useMock support ([f6aa53d](https://github.com/AntelopeJS/redis/commit/f6aa53d))

### 🏡 Chore

- Update package.json ([887876b](https://github.com/AntelopeJS/redis/commit/887876b))

### ❤️ Contributors

- Antony Rizzitelli <upd4ting@gmail.com>

## v1.0.0

[compare changes](https://github.com/AntelopeJS/redis/compare/v0.1.1...v1.0.0)

### 🩹 Fixes

- **redis_scheduler:** Use lazyConnect for listener duplicate client ([#12](https://github.com/AntelopeJS/redis/pull/12))

### 💅 Refactors

- Use ioredis client ([#10](https://github.com/AntelopeJS/redis/pull/10))

### 📖 Documentation

- Allow TSDoc for public APIs in no-comments rule ([180cbcc](https://github.com/AntelopeJS/redis/commit/180cbcc))

### 📦 Build

- Replace rm -rf with rimraf ([#9](https://github.com/AntelopeJS/redis/pull/9))

### 🏡 Chore

- Add Claude Code and agent configuration files ([9ed1ec9](https://github.com/AntelopeJS/redis/commit/9ed1ec9))
- Remove skill-creator skill ([63c46de](https://github.com/AntelopeJS/redis/commit/63c46de))
- Remove agent skills and commands ([d7fc5cb](https://github.com/AntelopeJS/redis/commit/d7fc5cb))
- **playground:** Reset to minimal stubs ([3aaf225](https://github.com/AntelopeJS/redis/commit/3aaf225))
- Simplify CI workflow triggers and update AGENTS.md ([6e9d028](https://github.com/AntelopeJS/redis/commit/6e9d028))
- Migrate from ESLint + Prettier to Biome ([#13](https://github.com/AntelopeJS/redis/pull/13))
- Migrate from local beta interfaces to published @antelopejs packages ([0ed6a1d](https://github.com/AntelopeJS/redis/commit/0ed6a1d))

### ✅ Tests

- Add interface tests with ioredis-mock support ([#11](https://github.com/AntelopeJS/redis/pull/11))

### 🤖 CI

- Remove test:coverage step from CI workflow ([3f0c86c](https://github.com/AntelopeJS/redis/commit/3f0c86c))

### ❤️ Contributors

- Antony Rizzitelli <upd4ting@gmail.com>
- Glastis ([@Glastis](http://github.com/Glastis))

## v0.1.1

[compare changes](https://github.com/AntelopeJS/redis/compare/v0.1.0...v0.1.1)

### 🚀 Enhancements

- Changelog generation is now using changelogen ([#7](https://github.com/AntelopeJS/redis/pull/7))

### 🩹 Fixes

- Connect scheduler subscriber ([b17e4a2](https://github.com/AntelopeJS/redis/commit/b17e4a2))

### 📖 Documentation

- Improved shields ([#5](https://github.com/AntelopeJS/redis/pull/5))

### 📦 Build

- Update prepare command ([b1091cc](https://github.com/AntelopeJS/redis/commit/b1091cc))
- Command 'build' that remove previous one before building ([#6](https://github.com/AntelopeJS/redis/pull/6))
- Update changelog config ([6e3c709](https://github.com/AntelopeJS/redis/commit/6e3c709))

### 🏡 Chore

- Update tsconfig.json paths ([97429ce](https://github.com/AntelopeJS/redis/commit/97429ce))

### 🤖 CI

- Add GitHub Workflow to validate interface export ([#8](https://github.com/AntelopeJS/redis/pull/8))

### ❤️ Contributors

- Antony Rizzitelli <upd4ting@gmail.com>
- Thomas ([@Thomasims](http://github.com/Thomasims))
- Thomasims <thomas@antelopejs.com>
- Fabrice Cst <fabrice@altab.be>
- Glastis ([@Glastis](http://github.com/Glastis))

## [0.1.0](https://github.com/AntelopeJS/redis/compare/v0.0.1...v0.1.0) (2025-05-29)

### Features

* default config ([#4](https://github.com/AntelopeJS/redis/issues/4)) ([5febc0c](https://github.com/AntelopeJS/redis/commit/5febc0ce50e0557074ff58ee11102a572bbf761b))

### Bug Fixes

* avoid setTimeout error when waiting more than 24 days (int32 limit) ([9cfb895](https://github.com/AntelopeJS/redis/commit/9cfb895ef051dee313ea4b84ba5fd3806c0d0afa))

## 0.0.1 (2025-05-08)
