import { transformAsync } from '@babel/core'

import asyncBabelPlugin, { Options } from '../babel-plugin'

const defaultImport = 'asyncComponent'
const defaultPackage = '@odesza/async-toolkit'
const defaultOptions = { functions: [defaultImport], webpack: true }

describe('Async Babel Plugin', () => {
  it('does nothing to an unrelated function call', async () => {
    const code = await normalize(`
      import { notRightImport } from '${defaultPackage}'

      notRightImport({
        load: () => import(/* webpackChunkName: "id" */ './Foo/Bar/someComponent/some-Thing'),
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('does not add an id prop if there are no arguments', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}()
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('does not add an id prop if the first argument is not an object', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}(() => import('./Foo'))
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('does not add an id prop if the first argument does not have a load prop', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        ...otherOptions,
        [complexExpression()]: value,
        'non-identifier': () => import('./Bar'),
        notLoad: () => import('./Foo'),
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('does not add an id prop if the load prop is not a function', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        ...otherOptions,
        load: Foo,
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('does not process a function that has a scoped binding with the same name as the import', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      {
        const ${defaultImport} = UNRELATED_FUNCTION

        ${defaultImport}({
          load: () => import('./Foo'),
        })
      }
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('does not add an id prop if one exists', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        id: () => './Foo',
        load: () => import('./Foo'),
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('does not add an id prop if no dynamic imports exist', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: () => Foo,
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('does not process the binding if it is not a call expression', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      export {${defaultImport}}
    `)

    expect(await transform(code, defaultOptions)).toBe(code)
  })

  it('adds an id prop that returns the require.resolveWeak of the first dynamic import in load', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: () => import('./Foo'),
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(
      await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: () => import(/*webpackChunkName: "Foo"*/'./Foo'),
        id: () => require.resolveWeak('./Foo'),
      })
    `)
    )
  })

  it('adds an id prop when load is a method', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load() { return import('./Foo') },
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(
      await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load() { return import(/*webpackChunkName: "Foo"*/'./Foo') },
        id: () => require.resolveWeak('./Foo'),
      })
    `)
    )
  })

  it('adds an id prop when load is a function declaration', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: function load() { return import('./Foo') },
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(
      await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: function load() { return import(/*webpackChunkName: "Foo"*/'./Foo') },
        id: () => require.resolveWeak('./Foo'),
      })
    `)
    )
  })

  it('adds an id prop that returns the require.resolve of the first dynamic import in load when not in webpack', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: () => import('./Foo'),
      })
    `)

    expect(await transform(code, { ...defaultOptions, webpack: false })).toBe(
      await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: () => import('./Foo'),
        id: () => require.resolve('./Foo'),
      })
    `)
    )
  })

  it('does not add magic comment if already there', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: () => import(/*webpackChunkName: "Foo"*/'./Foo'),
      })
    `)

    expect(await transform(code, defaultOptions)).toBe(
      await normalize(`
      import {${defaultImport}} from '${defaultPackage}'

      ${defaultImport}({
        load: () => import(/*webpackChunkName: "Foo"*/'./Foo'),
        id: () => require.resolveWeak('./Foo')
      })
      `)
    )
  })
})

async function normalize(code: string) {
  const result = await transformAsync(code, {
    plugins: [require('@babel/plugin-syntax-dynamic-import')],
    configFile: false
  })

  return (result && result.code) || ''
}

const transform = async function (
  code: string,
  options: Partial<Options> = {}
) {
  const result = await transformAsync(code, {
    plugins: [[asyncBabelPlugin, options]],
    configFile: false
  })

  return (result && result.code) || ''
}
