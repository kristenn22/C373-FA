const UserRegistry = artifacts.require('UserRegistry');

module.exports = async function (deployer) {
  await deployer.deploy(UserRegistry);
  const registry = await UserRegistry.deployed();

  const adminEmail = 'c373@mail.com';
  const adminPassword = 'C3732026!';
  const emailHash = web3.utils.keccak256(adminEmail.toLowerCase());
  const passwordHash = web3.utils.keccak256(adminPassword);

  await registry.registerUserByEmail(emailHash, passwordHash);
  await registry.setAdminByEmailHash(emailHash);
};
