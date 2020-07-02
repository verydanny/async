import syntaxDynamicImport from '@babel/plugin-syntax-dynamic-import';
const DEFAULT_FUNCTIONS = ['createResolver', 'asyncComponent'];
const WEBPACK_CHUNKNAME = /webpackchunkname/i;
const PATH_REGEX = /(?!\.\/)(\w+)/g;
function cleanImportPath(path) {
    const result = [];
    let matchArr;
    while ((matchArr = PATH_REGEX.exec(path)) !== null) {
        result.push(matchArr[0]);
    }
    return result;
}
const hasMagicWebpackComment = (comment) => ['leadingComments', 'trailingComments', 'innerComments'].some((type) => {
    if (comment.has(type)) {
        const commentSource = comment.get(type)[0].getSource();
        return WEBPACK_CHUNKNAME.test(commentSource);
    }
    return false;
});
function addProps(binding, t, { webpack = true } = {}) {
    binding.referencePaths.forEach((reference) => {
        const parentPath = reference.parentPath;
        if (!parentPath.isCallExpression()) {
            return undefined;
        }
        const args = parentPath.get('arguments');
        if (Array.isArray(args) && args.length === 0)
            return undefined;
        const options = args[0];
        if (!options.isObjectExpression())
            return undefined;
        const properties = options.get('properties');
        const propertyMap = {};
        properties.forEach((property) => {
            if (!property.isObjectMember() || property.node.computed)
                return undefined;
            const key = property.get('key');
            if (!key.isIdentifier()) {
                return undefined;
            }
            propertyMap[key.node.name] = property;
        });
        const { id, load: loadProperty } = propertyMap;
        if (id != null || loadProperty == null)
            return undefined;
        const loaderMethod = loadProperty.isObjectProperty()
            ? loadProperty.get('value')
            : loadProperty.get('body');
        const dynamicImports = [];
        if (!Array.isArray(loaderMethod)) {
            loaderMethod.traverse({
                Import({ parentPath }) {
                    if (parentPath.isCallExpression()) {
                        dynamicImports.push(parentPath);
                    }
                }
            });
        }
        if (!dynamicImports.length)
            return undefined;
        const dynamicImportOne = dynamicImports[0].get('arguments.0');
        if (dynamicImportOne.isStringLiteral()) {
            if (webpack && !hasMagicWebpackComment(dynamicImportOne)) {
                const dynamicImportPath = dynamicImportOne.getSource();
                const cleanedImportPath = cleanImportPath(dynamicImportPath).join('-');
                dynamicImportOne.addComment('leading', `webpackChunkName: "${cleanedImportPath}"`);
            }
        }
        if (webpack) {
            loadProperty.insertAfter(t.objectProperty(t.identifier('id'), t.arrowFunctionExpression([], t.callExpression(t.memberExpression(t.identifier('require'), t.identifier('resolveWeak')), [dynamicImports[0].get('arguments')[0].node]))));
        }
        else {
            propertyMap.load.insertAfter(t.objectProperty(t.identifier('id'), t.arrowFunctionExpression([], t.callExpression(t.memberExpression(t.identifier('require'), t.identifier('resolve')), [dynamicImports[0].get('arguments')[0].node]))));
        }
    });
}
export default function asyncBabelPlugin({ types: t }) {
    return {
        inherits: syntaxDynamicImport,
        // not required, but useful for diagnostics
        name: '@rentpath/async-toolkit/babel-plugin',
        visitor: {
            Program(_path, state) {
                state.processFunctions = new Set((state.opts && state.opts.functions) || DEFAULT_FUNCTIONS);
            },
            ImportDeclaration(path, state) {
                const { processFunctions } = state;
                const testableFunction = Array.from(processFunctions);
                const importSpecifiers = path.get('specifiers').filter((spec) => {
                    if (spec.isImportSpecifier()) {
                        const matches = testableFunction.some((func) => {
                            const importedIdent = spec.get('imported');
                            if (!Array.isArray(importedIdent)) {
                                return importedIdent.isIdentifier({ name: func });
                            }
                        });
                        return matches;
                    }
                });
                if (importSpecifiers.length === 0)
                    return undefined;
                if (importSpecifiers) {
                    for (const importSpecifier of importSpecifiers) {
                        const binding = path.scope.getBinding(importSpecifier.node.local.name);
                        if (binding != null) {
                            addProps(binding, t, state.opts);
                        }
                    }
                }
            }
        }
    };
}
