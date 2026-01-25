let returnContract = null;

// Load ReturnRequestContract
async function loadReturnRequestContract(web3) {
  const res = await fetch('/build/ReturnRequestContract.json');
  const data = await res.json();

  const networkId = await web3.eth.net.getId();
  const deployedNetwork = data.networks[networkId];

  if (!deployedNetwork) {
    console.warn("ReturnRequestContract not deployed");
    return null;
  }

  returnContract = new web3.eth.Contract(
    data.abi,
    deployedNetwork.address
  );

  return returnContract;
}

//buyer functions
async function buyerRequestReturn(orderId, seller, account) {
  const reason = prompt("Enter reason for return/refund:");
  if (!reason) return;

  if (!returnContract) {
    alert("Return request saved (mock mode).");
    return;
  }

  await returnContract.methods
    .requestReturn(orderId, seller, reason)
    .send({ from: account, gas: 500000 });

  alert("Return/Refund requested.");
}

//seller functions
async function sellerApproveReturn(orderId, account) {
  if (!returnContract) {
    alert("Approved (mock mode).");
    return;
  }

  await returnContract.methods
    .approve(orderId, "Approved by seller")
    .send({ from: account, gas: 500000 });

  alert("Return approved.");
}

async function sellerRejectReturn(orderId, account) {
  const reason = prompt("Reason for rejection:");
  if (!reason) return;

  if (!returnContract) {
    alert("Rejected (mock mode).");
    return;
  }

  await returnContract.methods
    .reject(orderId, reason)
    .send({ from: account, gas: 500000 });

  alert("Return rejected.");
}