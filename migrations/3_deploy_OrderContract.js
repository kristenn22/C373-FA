const OrderContract = artifacts.require("OrderContract");

module.exports = function(deployer) {
  deployer.deploy(OrderContract);
};
