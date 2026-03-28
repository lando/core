'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.should();

const {findFreePort, allocatePorts} = require('../utils/allocate-ports');

describe('allocate-ports', () => {
  describe('#findFreePort', () => {
    it('should return a number', async () => {
      const port = await findFreePort();
      expect(port).to.be.a('number');
    });

    it('should return a port > 0', async () => {
      const port = await findFreePort();
      expect(port).to.be.greaterThan(0);
    });

    it('should return a port in the valid range', async () => {
      const port = await findFreePort();
      expect(port).to.be.at.least(1024);
      expect(port).to.be.at.most(65535);
    });
  });

  describe('#allocatePorts', () => {
    it('should rewrite "80" to "127.0.0.1:PORT:80"', async () => {
      const result = await allocatePorts(['80']);
      result.should.have.lengthOf(1);
      result[0].should.match(/^127\.0\.0\.1:\d+:80$/);
      const hostPort = parseInt(result[0].split(':')[1], 10);
      expect(hostPort).to.be.greaterThan(0);
    });

    it('should rewrite "127.0.0.1::80" to "127.0.0.1:PORT:80"', async () => {
      const result = await allocatePorts(['127.0.0.1::80']);
      result.should.have.lengthOf(1);
      result[0].should.match(/^127\.0\.0\.1:\d+:80$/);
    });

    it('should rewrite "::80" to "127.0.0.1:PORT:80"', async () => {
      const result = await allocatePorts(['::80']);
      result.should.have.lengthOf(1);
      result[0].should.match(/^127\.0\.0\.1:\d+:80$/);
    });

    it('should rewrite ":80" to "127.0.0.1:PORT:80"', async () => {
      const result = await allocatePorts([':80']);
      result.should.have.lengthOf(1);
      result[0].should.match(/^127\.0\.0\.1:\d+:80$/);
    });

    it('should pass through "8080:80" unchanged', async () => {
      const result = await allocatePorts(['8080:80']);
      result.should.deep.equal(['8080:80']);
    });

    it('should pass through "127.0.0.1:8080:80" unchanged', async () => {
      const result = await allocatePorts(['127.0.0.1:8080:80']);
      result.should.deep.equal(['127.0.0.1:8080:80']);
    });

    it('should handle null gracefully', async () => {
      const result = await allocatePorts(null);
      expect(result).to.be.null;
    });

    it('should handle undefined gracefully', async () => {
      const result = await allocatePorts(undefined);
      expect(result).to.be.undefined;
    });

    it('should handle empty array', async () => {
      const result = await allocatePorts([]);
      result.should.deep.equal([]);
    });

    it('should pass through object port specs', async () => {
      const objPort = {target: 80, published: 8080, protocol: 'tcp'};
      const result = await allocatePorts([objPort]);
      result.should.deep.equal([objPort]);
    });

    it('should handle mixed port specs', async () => {
      const result = await allocatePorts(['80', '8080:80', '127.0.0.1::443']);
      result.should.have.lengthOf(3);
      result[0].should.match(/^127\.0\.0\.1:\d+:80$/);
      result[1].should.equal('8080:80');
      result[2].should.match(/^127\.0\.0\.1:\d+:443$/);
    });

    it('should preserve custom bind host', async () => {
      const result = await allocatePorts(['0.0.0.0::80']);
      result.should.have.lengthOf(1);
      result[0].should.match(/^0\.0\.0\.0:\d+:80$/);
    });
  });
});
