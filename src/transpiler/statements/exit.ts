import * as abaplint from "abaplint";
import {IStatementTranspiler} from "./_statement_transpiler";

export class ExitTranspiler implements IStatementTranspiler {

  public transpile(_node: abaplint.Nodes.StatementNode): string {
    return "break;";
  }

}