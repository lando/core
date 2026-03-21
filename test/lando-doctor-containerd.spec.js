"use strict";

const chai = require("chai");
const expect = chai.expect;

const runChecks = require("../hooks/lando-doctor-containerd");

describe("lando-doctor-containerd", () => {
  const mockLando = (overrides = {}) => ({
    config: {
      userConfRoot: "/tmp/test-lando-doctor",
      containerdBin: null,
      buildkitdBin: null,
      finchDaemonBin: null,
      orchestratorBin: null,
      containerdSocket: null,
      finchDaemonSocket: null,
      ...overrides,
    },
  });

  describe("#runChecks", () => {
    it("should return an array of check results", async () => {
      const checks = await runChecks(mockLando());
      expect(checks).to.be.an("array");
      expect(checks.length).to.be.greaterThan(0);
    });

    it("should include binary checks for all required binaries", async () => {
      const checks = await runChecks(mockLando());
      const binaryChecks = checks.filter(c => c.title.includes("binary"));
      // containerd, buildkitd, finch-daemon, docker-compose
      expect(binaryChecks).to.have.lengthOf(4);
      const names = binaryChecks.map(c => c.title);
      expect(names).to.include("containerd binary");
      expect(names).to.include("buildkitd binary");
      expect(names).to.include("finch-daemon binary");
      expect(names).to.include("docker-compose binary");
    });

    it("should NOT include nerdctl binary check (per BRIEF)", async () => {
      const checks = await runChecks(mockLando());
      const nerdctlCheck = checks.find(c => c.title === "nerdctl binary");
      expect(nerdctlCheck).to.be.undefined;
    });

    it("should include daemon checks for all required daemons", async () => {
      const checks = await runChecks(mockLando());
      const daemonChecks = checks.filter(c => c.title.endsWith("daemon"));
      expect(daemonChecks).to.have.lengthOf(3);
      const names = daemonChecks.map(c => c.title);
      expect(names).to.include("containerd daemon");
      expect(names).to.include("buildkitd daemon");
      expect(names).to.include("finch-daemon daemon");
    });

    it("should include finch-daemon connectivity check", async () => {
      const checks = await runChecks(mockLando());
      const connCheck = checks.find(c => c.title === "finch-daemon connectivity");
      expect(connCheck).to.exist;
    });

    it("each check should have title, status, and message", async () => {
      const checks = await runChecks(mockLando());
      for (const check of checks) {
        expect(check).to.have.property("title").that.is.a("string");
        expect(check).to.have.property("status").that.is.oneOf(["ok", "warning", "error"]);
        expect(check).to.have.property("message").that.is.a("string");
      }
    });

    it("should report error for missing binaries", async () => {
      const checks = await runChecks(mockLando({
        containerdBin: "/nonexistent/containerd",
      }));
      const containerdCheck = checks.find(c => c.title === "containerd binary");
      expect(containerdCheck.status).to.equal("error");
      expect(containerdCheck.message).to.include("Not found");
    });

    it("should report warning for missing daemon sockets", async () => {
      const checks = await runChecks(mockLando({
        containerdSocket: "/nonexistent/containerd.sock",
      }));
      const daemonCheck = checks.find(c => c.title === "containerd daemon");
      expect(daemonCheck.status).to.equal("warning");
      expect(daemonCheck.message).to.include("not found");
    });

    it("should use custom paths when provided in config", async () => {
      const checks = await runChecks(mockLando({
        containerdBin: "/custom/path/containerd",
      }));
      const check = checks.find(c => c.title === "containerd binary");
      expect(check.message).to.include("/custom/path/containerd");
    });
  });
});
