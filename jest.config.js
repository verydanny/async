const { readdirSync, existsSync } = require('fs')
const path = require('path')

const moduleNameMapper = getPackageNames().reduce((accumulator, name) => {
  const scopedName = `@torpedus/${name}$`
  accumulator[scopedName] = `<rootDir>/packages/${name}/src/index.ts`
  return accumulator
}, {})

module.exports = {
  setupFiles: ['./test/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.[t|j]sx?$': 'babel-jest',
    '\\.(gql|graphql)$': 'jest-transform-graphql'
  },
  watchPathIgnorePatterns: ['<rootDir>/node_modules/'],
  testRegex: '.*\\.test\\.tsx?$',
  testEnvironmentOptions: {
    url: 'http://localhost:3000/'
  },
  coverageDirectory: './coverage/',
  collectCoverage: true,
  moduleNameMapper
}

function getPackageNames() {
  const packagesPath = path.join(__dirname, 'packages')
  return readdirSync(packagesPath).filter((packageName) => {
    const packageJSONPath = path.join(packagesPath, packageName, 'package.json')
    return existsSync(packageJSONPath)
  })
}
