const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Deixa o Metro enxergar pacotes hoistados na raiz do monorepo
config.watchFolders = [monorepoRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Garante que o Metro resolve pacotes do workspace (@cc/shared etc.)
config.resolver.disableHierarchicalLookup = false

// Ignora arquivos de metadados do macOS (._*) e outros não-código
config.resolver.blockList = [
  /.*\/\._.*/, // arquivos AppleDouble do macOS
  /.*\.DS_Store$/,
]

module.exports = config
