const SellerOrderContract = artifacts.require("SellerOrderContract");

module.exports = function(deployer) {
  deployer.deploy(SellerOrderContract);
};
