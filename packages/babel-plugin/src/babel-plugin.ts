import syntaxDynamicImport from '@babel/plugin-syntax-dynamic-import'
import Types from '@babel/types'
import { NodePath, Binding } from '@babel/traverse'

const DEFAULT_FUNCTIONS = ['createResolver', 'asyncComponent']
const WEBPACK_CHUNKNAME = /webpackchunkname/i
const PATH_REGEX = /(?!\.\/)(\w+)/g

export interface Options {
  webpack?: boolean
  functions?: string[]
}

interface State {
  processFunctions: Set<string>
  opts?: Options
}

function cleanImportPath(path: string) {
  const result: string[] = []
  let matchArr: RegExpExecArray | null

  while ((matchArr = PATH_REGEX.exec(path)) !== null) {
    result.push(matchArr[0])
  }

  return result
}

const hasMagicWebpackComment = <T extends Types.StringLiteral>(
  comment: NodePath<T>
) =>
  ['leadingComments', 'trailingComments', 'innerComments'].some((type) => {
    if (comment.has(type)) {
      const commentSource = (comment.get(type)[0] as
        | NodePath<Types.CommentBlock>
        | NodePath<Types.CommentLine>).getSource()

      return WEBPACK_CHUNKNAME.test(commentSource)
    }

    return false
  })

function addProps(
  binding: Binding,
  t: typeof Types,
  { webpack = true }: Options = {}
) {
  binding.referencePaths.forEach((reference) => {
    const parentPath = reference.parentPath

    if (!parentPath.isCallExpression()) {
      return undefined
    }

    const args = parentPath.get('arguments')

    if (Array.isArray(args) && args.length === 0) return undefined

    const options: NodePath<Types.ObjectExpression> = args[0]
    if (!options.isObjectExpression()) return undefined

    const properties = options.get('properties') as NodePath<
      Types.ObjectProperty
    >[]

    const propertyMap: {
      [key: string]: NodePath<Types.ObjectMember>
    } = {}

    properties.forEach((property) => {
      if (!property.isObjectMember() || property.node.computed) return undefined

      const key = property.get('key') as NodePath

      if (!key.isIdentifier()) {
        return undefined
      }

      propertyMap[key.node.name] = property
    })

    const { id, load: loadProperty } = propertyMap

    if (id != null || loadProperty == null) return undefined

    const loaderMethod = loadProperty.isObjectProperty()
      ? loadProperty.get('value')
      : loadProperty.get('body')

    const dynamicImports: NodePath<Types.CallExpression>[] = []

    if (!Array.isArray(loaderMethod)) {
      loaderMethod.traverse({
        Import({ parentPath }) {
          if (parentPath.isCallExpression()) {
            dynamicImports.push(parentPath)
          }
        }
      })
    }

    if (!dynamicImports.length) return undefined

    const dynamicImportOne = dynamicImports[0].get('arguments.0') as NodePath<
      Types.Node
    >

    if (dynamicImportOne.isStringLiteral()) {
      if (webpack && !hasMagicWebpackComment(dynamicImportOne)) {
        const dynamicImportPath = dynamicImportOne.getSource()
        const cleanedImportPath = cleanImportPath(dynamicImportPath).join('-')

        dynamicImportOne.addComment(
          'leading',
          `webpackChunkName: "${cleanedImportPath}"`
        )
      }
    }

    if (webpack) {
      loadProperty.insertAfter(
        t.objectProperty(
          t.identifier('id'),
          t.arrowFunctionExpression(
            [],
            t.callExpression(
              t.memberExpression(
                t.identifier('require'),
                t.identifier('resolveWeak')
              ),
              [dynamicImports[0].get('arguments')[0].node]
            )
          )
        )
      )
    } else {
      propertyMap.load.insertAfter(
        t.objectProperty(
          t.identifier('id'),
          t.arrowFunctionExpression(
            [],
            t.callExpression(
              t.memberExpression(
                t.identifier('require'),
                t.identifier('resolve')
              ),
              [dynamicImports[0].get('arguments')[0].node]
            )
          )
        )
      )
    }
  })
}

export default function asyncBabelPlugin({
  types: t
}: {
  types: typeof Types
}) {
  return {
    inherits: syntaxDynamicImport,
    // not required, but useful for diagnostics
    name: '@torpedus/async/babel-plugin',
    visitor: {
      Program(_path: NodePath<Types.Program>, state: State) {
        state.processFunctions = new Set(
          (state.opts && state.opts.functions) || DEFAULT_FUNCTIONS
        )
      },
      ImportDeclaration(path: NodePath<Types.ImportDeclaration>, state: State) {
        const { processFunctions } = state

        const testableFunction = Array.from(processFunctions)
        const specifiers = path.get('specifiers')

        const importSpecifiers = specifiers.filter((spec) => {
          if (spec.isImportSpecifier()) {
            const matches = testableFunction.some((func) => {
              const importedIdent = spec.get('imported')

              if (!Array.isArray(importedIdent)) {
                return importedIdent.isIdentifier({ name: func })
              }
            })

            return matches
          }
        })

        if (importSpecifiers.length === 0) return undefined

        if (importSpecifiers) {
          for (const importSpecifier of importSpecifiers) {
            const binding = path.scope.getBinding(
              importSpecifier.node.local.name
            )

            if (binding != null) {
              addProps(binding, t, state.opts)
            }
          }
        }
      }
    }
  }
}
