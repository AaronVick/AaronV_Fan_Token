// manual_module/airstack-node-sdk-main/src/utils/addCursorVariable.ts

import { parse, print, visit, OperationDefinitionNode, SelectionSetNode, FieldNode } from 'graphql';
import { QueryContext } from '../types';

export function addCursorVariable(
  query: string,
  cursor: string,
  context: QueryContext
): string {
  const ast = parse(query);
  const variableName = `cursor_${context.variableNamesMap['cursor'] || 0}`;
  context.variableNamesMap['cursor'] = (context.variableNamesMap['cursor'] || 0) + 1;

  const newAst = visit(ast, {
    OperationDefinition(node: OperationDefinitionNode) {
      return {
        ...node,
        variableDefinitions: [
          ...(node.variableDefinitions || []),
          {
            kind: 'VariableDefinition',
            variable: {
              kind: 'Variable',
              name: {
                kind: 'Name',
                value: variableName,
              },
            },
            type: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: 'String',
              },
            },
          },
        ],
      };
    },
    SelectionSet(node: SelectionSetNode) {
      const hasPageInfo = node.selections.some(
        (selection) =>
          selection.kind === 'Field' && selection.name.value === 'pageInfo'
      );

      if (hasPageInfo) {
        return {
          ...node,
          selections: [
            ...node.selections,
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'cursor',
              },
              arguments: [
                {
                  kind: 'Argument',
                  name: {
                    kind: 'Name',
                    value: 'cursor',
                  },
                  value: {
                    kind: 'Variable',
                    name: {
                      kind: 'Name',
                      value: variableName,
                    },
                  },
                },
              ],
            },
          ],
        };
      }

      return node;
    },
  });

  return print(newAst);
}
