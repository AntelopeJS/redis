import { antelopeKnipConfig } from "@antelopejs/tooling-configs/knip";

export default antelopeKnipConfig({
  ignoreDependencies: ["chai", "@types/chai", "@types/mocha"],
});
