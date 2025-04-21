import * as Lib from "metabase-lib";
import type { Expression } from "metabase-types/api";

import { type ExpressionError, renderError } from "./errors";
import { compile, lexify, parse } from "./pratt";
import { type Resolver, resolver as defaultResolver } from "./resolver";
import type { Hooks, StartRule } from "./types";
import { maybe } from "./utils";

export type CompileResult =
  | {
      error: ExpressionError;
      expression: null;
      expressionParts: null;
      expressionClause: null;
    }
  | {
      error: null;
      expression: Expression;
      expressionParts: Lib.ExpressionParts | Lib.ExpressionArg;
      expressionClause: Lib.ExpressionClause;
    };

export function compileExpression({
  source,
  startRule,
  query,
  stageIndex,
  resolver = defaultResolver({
    query,
    stageIndex,
    startRule,
  }),
  hooks = {},
}: {
  source: string;
  startRule: StartRule;
  query: Lib.Query;
  stageIndex: number;
  resolver?: Resolver | null;
  hooks?: Hooks;
}): CompileResult {
  try {
    const { tokens } = maybe(lexify(source));
    hooks.lexified?.({ tokens });

    const { root } = maybe(parse(tokens));
    const expressionParts = compile(root, {
      startRule,
      resolver,
    });

    const expressionClause = Lib.expressionClause(expressionParts);
    const expression = Lib.legacyExpressionForExpressionClause(
      query,
      stageIndex,
      expressionClause,
    );

    hooks.compiled?.({ expressionClause, expressionParts });

    return {
      expression,
      expressionParts,
      expressionClause,
      error: null,
    };
  } catch (error) {
    return {
      expression: null,
      expressionParts: null,
      expressionClause: null,
      error: renderError(error),
    };
  }
}
