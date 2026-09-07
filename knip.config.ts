import { antelopeKnipConfig } from "@antelopejs/tooling-configs/knip";

export default antelopeKnipConfig({
  // `ajs` comes from @antelopejs/core, which CI installs globally rather than
  // pulling the whole CLI into every module's dependency tree.
  ignoreBinaries: ["ajs"],
  ignoreDependencies: [
    // The redis conformance suites ship compiled inside the interface packages
    // and `require("chai")` out of this module's own node_modules, so
    // `ajs module test` needs these here even though no source file imports them.
    "chai",
    "@types/chai",
    // Mocha's globals, supplied to those same suites.
    "@types/mocha",
  ],
});
