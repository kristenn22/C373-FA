// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UserRegistry {
    enum Role { None, User, Seller, Admin }

    struct User {
        bytes32 emailHash;
        bytes32 passwordHash;
        Role role;
        address wallet;
    }

    mapping(bytes32 => User) private usersByEmailHash;
    mapping(address => bytes32) private emailHashByAddress;
    bytes32[] private emailHashes;

    event UserRegistered(address indexed account, bytes32 indexed emailHash, Role role);
    event AdminGranted(address indexed account);

    modifier onlyAdmin() {
        bytes32 emailHash = emailHashByAddress[msg.sender];
        require(emailHash != bytes32(0), "Only admin");
        require(usersByEmailHash[emailHash].role == Role.Admin, "Only admin");
        _;
    }

    constructor() {
        bytes32 adminHash = bytes32(uint256(uint160(msg.sender)));
        usersByEmailHash[adminHash] = User({
            emailHash: bytes32(0),
            passwordHash: bytes32(0),
            role: Role.Admin,
            wallet: msg.sender
        });
        emailHashByAddress[msg.sender] = adminHash;
    }

    function registerUser(bytes32 emailHash, bytes32 passwordHash) external {
        require(emailHash != bytes32(0), "Email required");
        require(passwordHash != bytes32(0), "Password required");
        require(emailHashByAddress[msg.sender] == bytes32(0), "Already registered");
        require(usersByEmailHash[emailHash].role == Role.None, "Email already used");

        usersByEmailHash[emailHash] = User({
            emailHash: emailHash,
            passwordHash: passwordHash,
            role: Role.User,
            wallet: msg.sender
        });
        emailHashByAddress[msg.sender] = emailHash;
        emailHashes.push(emailHash);

        emit UserRegistered(msg.sender, emailHash, Role.User);
    }

    function registerUserByEmail(bytes32 emailHash, bytes32 passwordHash) external onlyAdmin {
        registerUserByEmailWithRole(emailHash, passwordHash, Role.User);
    }

    function registerUserByEmailWithRole(
        bytes32 emailHash,
        bytes32 passwordHash,
        Role role
    ) public onlyAdmin {
        require(emailHash != bytes32(0), "Email required");
        require(passwordHash != bytes32(0), "Password required");
        require(role == Role.User || role == Role.Seller, "Invalid role");
        require(usersByEmailHash[emailHash].role == Role.None, "Email already used");

        usersByEmailHash[emailHash] = User({
            emailHash: emailHash,
            passwordHash: passwordHash,
            role: role,
            wallet: address(0)
        });
        emailHashes.push(emailHash);

        emit UserRegistered(address(0), emailHash, role);
    }

    function setAdminByEmailHash(bytes32 emailHash) external onlyAdmin {
        require(emailHash != bytes32(0), "Email required");
        User storage user = usersByEmailHash[emailHash];
        require(user.role != Role.None, "User not registered");

        user.role = Role.Admin;
        emit AdminGranted(user.wallet);
    }

    function isRegistered(address account) external view returns (bool) {
        bytes32 emailHash = emailHashByAddress[account];
        return emailHash != bytes32(0) && usersByEmailHash[emailHash].role != Role.None;
    }

    function getRole(address account) external view returns (Role) {
        bytes32 emailHash = emailHashByAddress[account];
        if (emailHash == bytes32(0)) {
            return Role.None;
        }
        return usersByEmailHash[emailHash].role;
    }

    function getAccountByEmailHash(bytes32 emailHash) external view returns (address) {
        return usersByEmailHash[emailHash].wallet;
    }

    function getUserCount() external view returns (uint) {
        return emailHashes.length;
    }

    function getUserByIndex(uint index)
        external
        view
        returns (bytes32 emailHash, Role role, address wallet)
    {
        require(index < emailHashes.length, "Index out of range");
        bytes32 hash = emailHashes[index];
        User storage user = usersByEmailHash[hash];
        return (user.emailHash, user.role, user.wallet);
    }

    function verifyCredentials(bytes32 emailHash, bytes32 passwordHash)
        external
        view
        returns (bool isValid, Role role, address account)
    {
        User storage user = usersByEmailHash[emailHash];
        if (user.role == Role.None) {
            return (false, Role.None, address(0));
        }

        if (user.passwordHash != passwordHash) {
            return (false, Role.None, address(0));
        }

        return (true, user.role, user.wallet);
    }
}
