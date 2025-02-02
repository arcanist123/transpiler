import {append} from "./append";
import {assert} from "./assert";
import {assign} from "./assign";
import {clear} from "./clear";
import {commit} from "./commit";
import {rollback} from "./rollback";
import {concatenate} from "./concatenate";
import {condense} from "./condense";
import {deleteInternal} from "./delete_internal";
import {describe} from "./describe";
import {find} from "./find";
import {getBit} from "./get_bit";
import {setBit} from "./set_bit";
import {loop} from "./loop";
import {insertInternal} from "./insert_internal";
import {message} from "./message";
import {modifyInternal} from "./modify_internal";
import {readTable} from "./read_table";
import {replace} from "./replace";
import {select} from "./select";
import {shift} from "./shift";
import {sort} from "./sort";
import {split} from "./split";
import {getTime} from "./get_time";
import {translate} from "./translate";
import {write} from "./write";
import {Console} from "../console";
import {convert} from "./convert";

// this is a class, as statements like SELECT needs access to the database object instance
// and WRITE will access the Console
export class Statements {
  public append = append;
  public assert = assert;
  public assign = assign;
  public clear = clear;
  public getTime = getTime;
  public concatenate = concatenate;
  public condense = condense;
  public convert = convert;
  public deleteInternal = deleteInternal;
  public insertInternal = insertInternal;
  public describe = describe;
  public find = find;
  public getBit = getBit;
  public setBit = setBit;
  public loop = loop;
  public commit = commit;
  public rollback = rollback;
  public message = message;
  public modifyInternal = modifyInternal;
  public readTable = readTable;
  public replace = replace;
  public select = select;
  public shift = shift;
  public sort = sort;
  public split = split;
  public translate = translate;
  public write = write;

  // @ts-ignore
  private readonly console: Console;
  // @ts-ignore
  private db: any;

  public constructor(console: Console) {
    this.console = console;
  }

  public setDb(db: any) {
    this.db = db;
  }

}
