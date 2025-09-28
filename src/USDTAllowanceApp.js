import React, { useState, useEffect } from "react";
import { FaAddressBook, FaQrcode, FaInfoCircle, FaTimes } from "react-icons/fa";
import "./styles.css";

// ✅ TRC20 USDT contract on TRON mainnet
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

// ✅ Minimal ABI for TRC20 approve + allowance
const USDT_ABI = [
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

const USDTAllowanceApp = () => {
  const [tronWeb, setTronWeb] = useState(null);
  const [account, setAccount] = useState("");
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("");
  const [allowance, setAllowance] = useState("");
  const [message, setMessage] = useState("");

  // ✅ Detect TronWeb (Trust Wallet / TronLink)
  useEffect(() => {
    const checkTron = () => {
      if (window.tronWeb && window.tronWeb.ready) {
        setTronWeb(window.tronWeb);
        setAccount(window.tronWeb.defaultAddress.base58);
        setMessage("✅ Connected: " + window.tronWeb.defaultAddress.base58);
      } else {
        setMessage("⚠️ Open in Trust Wallet or TronLink DApp browser");
        setTimeout(checkTron, 1000);
      }
    };
    checkTron();
  }, []);

  // ✅ Connect wallet manually (for Trust Wallet DApp browser)
  const connectWallet = async () => {
    try {
      if (window.tronLink) {
        await window.tronLink.request({ method: "tron_requestAccounts" });
        setTronWeb(window.tronWeb);
        setAccount(window.tronWeb.defaultAddress.base58);
        setMessage("✅ Wallet connected: " + window.tronWeb.defaultAddress.base58);
      } else {
        setMessage("❌ TronLink/Trust Wallet not found");
      }
    } catch (err) {
      setMessage("❌ Connection failed: " + err.message);
    }
  };

  // ✅ Approve spender for amount
  const handleApprove = async () => {
    if (!tronWeb || !account) return setMessage("Please connect your wallet first");
    if (!spender || !amount) return setMessage("Enter spender and amount");

    try {
      const contract = await tronWeb.contract(USDT_ABI, USDT_CONTRACT);
      const tx = await contract.approve(spender, tronWeb.toSun(amount)).send({
        feeLimit: 100_000_000,
      });

      setMessage(`✅ Approval submitted! TxID: ${tx}`);
    } catch (err) {
      setMessage("❌ Transaction failed: " + (err?.message || err));
    }
  };

  // ✅ Check allowance
  const handleCheckAllowance = async () => {
    if (!tronWeb || !account) return setMessage("Please connect your wallet first");
    if (!spender) return setMessage("Enter spender address");

    try {
      const contract = await tronWeb.contract(USDT_ABI, USDT_CONTRACT);
      const result = await contract.allowance(account, spender).call();
      const formatted = tronWeb.fromSun(result.remaining.toString());
      setAllowance(formatted);
      setMessage(`✅ Allowance: ${formatted} USDT`);
    } catch (err) {
      setMessage("❌ Failed to fetch allowance: " + (err?.message || err));
    }
  };

  return (
    <div className="send-usdt-container">
      <div className="send-usdt-card">
        <div className="send-header">
          <button className="back-button">←</button>
          <h1 className="send-title">USDT Allowance (TRON)</h1>
          {!account ? (
            <button onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
          )}
        </div>

        {message && <div className="message-display">{message}</div>}

        {/* Spender */}
        <div className="input-section">
          <label className="input-label">Spender Address</label>
          <input value={spender} onChange={(e) => setSpender(e.target.value)} />
        </div>

        {/* Amount */}
        <div className="input-section">
          <label className="input-label">Amount (USDT)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="button-row">
          <button className="next-button" onClick={handleApprove}>Approve</button>
          <button className="next-button" onClick={handleCheckAllowance}>Check Allowance</button>
        </div>

        {allowance && (
          <p className="allowance-display">
            Current Allowance: {allowance} USDT
          </p>
        )}
      </div>
    </div>
  );
};

export default USDTAllowanceApp;
