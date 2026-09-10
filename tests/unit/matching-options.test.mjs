import test from "node:test";
import assert from "node:assert/strict";
import {
  MATCHING_OPTIONS,
  confirmMatchingOption,
  isMatchingOption,
  openMatchingOptions,
  selectMatchingOption
} from "../../src/matching-options.js";

test("the shared sheet model always exposes the three neutral options", () => {
  assert.deepEqual(MATCHING_OPTIONS, [
    { id: "n", label: "Option 1" },
    { id: "r", label: "Option 2" },
    { id: "d", label: "Option 3" }
  ]);
  assert.equal(isMatchingOption("n"), true);
  assert.equal(isMatchingOption("r"), true);
  assert.equal(isMatchingOption("d"), true);
  assert.equal(isMatchingOption("f"), false);
});

test("opening starts with no selection regardless of the previous run or completion", () => {
  const previouslySelected = selectMatchingOption(openMatchingOptions(), "r");
  assert.deepEqual(previouslySelected, { selectedOption: "r" });

  assert.deepEqual(openMatchingOptions(previouslySelected), { selectedOption: null });
  assert.deepEqual(openMatchingOptions({
    selectedOption: "d",
    optDone: { n: true, r: true, d: true }
  }), { selectedOption: null });
});

test("selection and reselection are local, single-choice, and do not emit", () => {
  const unopened = openMatchingOptions();
  const first = selectMatchingOption(unopened, "n");
  const changed = selectMatchingOption(first, "d");

  assert.deepEqual(unopened, { selectedOption: null }, "the source state is not mutated");
  assert.deepEqual(first, { selectedOption: "n" });
  assert.deepEqual(changed, { selectedOption: "d" });
  assert.equal(confirmMatchingOption(unopened), null);
  assert.equal(confirmMatchingOption(first), "n");
  assert.equal(confirmMatchingOption(changed), "d");
});

test("unknown values cannot become selected or confirmed", () => {
  const state = openMatchingOptions();
  assert.strictEqual(selectMatchingOption(state, "unknown"), state);
  assert.equal(confirmMatchingOption({ selectedOption: "unknown" }), null);
  assert.equal(confirmMatchingOption(null), null);
});
