import test from "node:test";
import assert from "node:assert/strict";
import { closurePercentage } from "../src/position.js";

test("reported HA opening is displayed as the remaining closed percentage", () => {
  for (const [opening,closed] of [[0,100],[1,99],[20,80],[50,50],[80,20],[99,1],[100,0]])
    assert.equal(closurePercentage(opening),closed,`${opening}% open must display ${closed}% closed`);
});
test("closure slider targets convert back to native HA opening targets", () => {
  for (const [closed,opening] of [[0,100],[60,40],[100,0]])
    assert.equal(closurePercentage(closed),opening,`${closed}% closed must send native position ${opening}`);
});
test("unknown or invalid positions remain unknown", () => {
  for (const value of [null,undefined,NaN,Infinity,-1,101,"0",false])
    assert.equal(closurePercentage(value),null);
});
