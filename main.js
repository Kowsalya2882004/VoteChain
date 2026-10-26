
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xAA7e18d425d918a35F365c2F52155683bBf93B79";

const ABI = [
  "function candidateACount() view returns (uint256)",
  "function candidateBCount() view returns (uint256)",
  "function hasVoted(address) view returns (bool)",
  "function vote(uint256 candidateId)"
];

let provider;
let signer;
let contract;

const connectBtn = document.getElementById("connectBtn");
const walletStatus = document.getElementById("walletStatus");
const message = document.getElementById("message");
const countA = document.getElementById("countA");
const countB = document.getElementById("countB");
const voteButtons = document.querySelectorAll(".vote-btn");

function showMessage(text) {
  message.textContent = text;
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      showMessage("Please install the MetaMask browser extension.");
      return;
    }

    provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();

    if (network.chainId !== 11155111n) {
      showMessage("Please switch MetaMask to the Sepolia network.");
      return;
    }

    signer = await provider.getSigner();

    contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ABI,
      signer
    );

    const address = await signer.getAddress();

    walletStatus.textContent =
      `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`;

    connectBtn.textContent = "Wallet Connected";

    showMessage("Wallet connected successfully!");

    await refreshCounts();
    await updateVotingStatus();
  } catch (error) {
    console.error(error);
    showMessage(error.shortMessage || error.message || "Wallet connection failed.");
  }
}

async function refreshCounts() {
  try {
    if (!contract) {
      showMessage("Connect MetaMask first.");
      return;
    }

    const [a, b] = await Promise.all([
      contract.candidateACount(),
      contract.candidateBCount()
    ]);

    countA.textContent = a.toString();
    countB.textContent = b.toString();
  } catch (error) {
    console.error(error);
    showMessage("Could not load vote counts.");
  }
}

async function updateVotingStatus() {
  if (!contract || !signer) return;

  try {
    const address = await signer.getAddress();
    const alreadyVoted = await contract.hasVoted(address);

    voteButtons.forEach((button) => {
      button.disabled = alreadyVoted;
      button.textContent = alreadyVoted
        ? "Already Voted"
        : button.dataset.candidate === "0"
          ? "Vote for A"
          : "Vote for B";
    });

    if (alreadyVoted) {
      showMessage("This wallet has already voted.");
    }
  } catch (error) {
    console.error(error);
  }
}

async function castVote(candidateId) {
  try {
    if (!contract) {
      showMessage("Connect MetaMask before voting.");
      return;
    }

    const address = await signer.getAddress();

    if (await contract.hasVoted(address)) {
      showMessage("This wallet has already voted.");
      await updateVotingStatus();
      return;
    }

    voteButtons.forEach((button) => {
      button.disabled = true;
    });

    showMessage("Please confirm your vote in MetaMask...");

    const transaction = await contract.vote(candidateId);

    showMessage("Vote submitted! Waiting for blockchain confirmation...");

    await transaction.wait();

    showMessage("Vote recorded successfully on Sepolia!");

    await refreshCounts();
    await updateVotingStatus();
  } catch (error) {
    console.error(error);

    showMessage(
      error.reason ||
      error.shortMessage ||
      "Vote failed. Check MetaMask and try again."
    );

    await updateVotingStatus();
  }
}

connectBtn.addEventListener("click", connectWallet);

document.getElementById("refreshBtn").addEventListener(
  "click",
  refreshCounts
);

voteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    castVote(Number(button.dataset.candidate));
  });
});

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => {
    window.location.reload();
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}

refreshCounts();
