import test from "node:test";
import assert from "node:assert/strict";
import { curtainPanels } from "../src/curtain.js";

test("right-to-left opening keeps the remaining fabric on the left", () => {
  for (const [position, width] of [[0,100],[20,80],[50,50],[80,20],[100,0]])
    assert.deepEqual(curtainPanels(position,"right-to-left"),[{side:"left",width}],`reported opening ${position}% must leave ${width}% on the left`);
});
test("existing center opening keeps two equal panels", () => {
  assert.deepEqual(curtainPanels(80),[{side:"left",width:10},{side:"right",width:10}]);
});
test("missing and unavailable positions do not invent a partial position", () => {
  for (const position of [null,undefined,NaN,-1,101,"50"])
    assert.deepEqual(curtainPanels(position,"right-to-left"),[{side:"left",width:0}]);
});
