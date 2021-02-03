import * as abaplint from "@abaplint/core";
import {IStatementTranspiler} from "./_statement_transpiler";
import {Traversal} from "../traversal";

export class EndMethodTranspiler implements IStatementTranspiler {

  public transpile(node: abaplint.Nodes.StatementNode, traversal: Traversal): string {
    const token = node.getFirstToken();

    const scope = traversal.findCurrentScope(token);
    if (scope === undefined) {
      throw new Error("EndMethodTranspiler, scope not found");
    }

    let returning: string = "";
    for (const v of scope.getData().vars) {
      if (v.identifier.getMeta().includes(abaplint.IdentifierMeta.MethodReturning)) {
        returning = "return " + v.name + ";\n";
      }
    }

    const data = scope.getIdentifier();
    if (data.stype === abaplint.ScopeType.Method && data.sname.toLowerCase() === "constructor") {
      returning = "return this;\n";
    }

    return returning + "}";
  }

}