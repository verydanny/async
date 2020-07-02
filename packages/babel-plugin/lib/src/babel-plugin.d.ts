import Types from '@babel/types';
import { NodePath } from '@babel/traverse';
export interface Options {
    webpack?: boolean;
    functions?: string[];
}
interface State {
    processFunctions: Set<string>;
    opts?: Options;
}
export default function asyncBabelPlugin({ types: t }: {
    types: typeof Types;
}): {
    inherits: any;
    name: string;
    visitor: {
        Program(_path: NodePath<Types.Program>, state: State): void;
        ImportDeclaration(path: NodePath<Types.ImportDeclaration>, state: State): undefined;
    };
};
export {};
//# sourceMappingURL=babel-plugin.d.ts.map