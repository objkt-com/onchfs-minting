import React, { useState, useEffect, useCallback } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import WalletConnection from './components/WalletConnection';
import CollectionDisplay from './components/CollectionDisplay';
import MintingProcess from './components/MintingProcess';
import LatestOnChainArt from './components/LatestOnChainArt';
import config from './networkConfig';
import './App.css';

type NetworkType = 'ghostnet' | 'mainnet';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<BeaconWallet | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [tezos, setTezos] = useState<TezosToolkit | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionLogo, setCollectionLogo] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkType>('mainnet');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initTezos = async () => {
      setLoading(true);
      const tezosInstance = new TezosToolkit(config[network].rpcUrl);
      setTezos(tezosInstance);
      setLoading(false);
    };

    initTezos();
  }, [network]);

  useEffect(() => {
    setSelectedCollection(null);
    setCollectionLogo(null);
  }, [network]);

  const setupTezos = useCallback(async (newWallet: BeaconWallet) => {
    if (tezos) {
      try {
        tezos.setWalletProvider(newWallet);
        const activeAccount = await newWallet.client.getActiveAccount();
        if (activeAccount) {
          setUserAddress(activeAccount.address);
        }
      } catch (err) {
        console.error('Error in setupTezos:', err);
        setError('Failed to setup Tezos wallet. Please try again.');
        setWallet(null);
        setUserAddress(null);
      }
    }
  }, [tezos]);

  const handleCollectionSelect = useCallback((collection: string, logo: string) => {
    setSelectedCollection(collection);
    setCollectionLogo(logo);
  }, []);

  const handleNetworkChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetwork = event.target.value as NetworkType;
    setNetwork(newNetwork);
    setWallet(null);
    setUserAddress(null);
    setError(null);
  }, []);

  return (
    <div className="App">
      <pre className="ascii-header">
{`     _     _ _   _                  _   ___                    _       _               
 ___| |_  |_| |_| |_    ___ ___ ___| |_|  _|___    ___ ___ ___| |_ ___| |_ _ _ ___ ___ 
| . | . | | | '_|  _|  | . |   |  _|   |  _|_ -|  | . |  _| . |  _| . |  _| | | . | -_|
|___|___|_| |_,_|_|    |___|_|_|___|_|_|_| |___|  |  _|_| |___|_| |___|_| |_  |  _|___|
        |___|                                     |_|                     |___|_|      
`}
      </pre>
      <div className="console-container">
        <div className="console-line">
          <span className="prompt">$</span> Network:
          <select className="console-select" value={network} onChange={handleNetworkChange}>
            <option value="mainnet">Mainnet</option>
            <option value="ghostnet">Ghostnet</option>
          </select>
        </div>
        <div className="console-line">
          <span className="prompt">$</span> Wallet:
          <WalletConnection
            wallet={wallet}
            setWallet={setWallet}
            userAddress={userAddress}
            setUserAddress={setUserAddress}
            setupTezos={setupTezos}
            network={network}
            error={error}
            setError={setError}
          />
        </div>
        {loading ? (
          <div className="console-line">
            <span className="prompt">$</span> Loading Tezos toolkit...
          </div>
        ) : userAddress && tezos ? (
          <div className="console-content">
            {selectedCollection ? (
              <div className="minting-container">
                <MintingProcess 
                  userAddress={userAddress} 
                  tezos={tezos} 
                  selectedCollection={selectedCollection}
                  collectionLogo={collectionLogo}
                  network={network}
                  config={config[network]}
                />
                <button className="console-button" onClick={() => {
                  setSelectedCollection(null);
                  setCollectionLogo(null);
                }}>Back to Collections</button>
              </div>
            ) : (
              <div className="collections-container">
                <div className="console-line">
                  <span className="prompt">$</span> Select a Collection:
                </div>
                <CollectionDisplay 
                  userAddress={userAddress} 
                  tezos={tezos} 
                  onSelectCollection={handleCollectionSelect}
                  network={network}
                  config={config[network]}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="console-line">
            <span className="prompt">$</span> Please connect your wallet to start minting and viewing collections.
          </div>
        )}
      </div>
      {!selectedCollection && (
        <div className="latest-art-container">
          <div className="console-line">
            <span className="prompt">$</span> Latest On-Chain Art on objkt:
          </div>
          <LatestOnChainArt networkType={network} />
        </div>
      )}
    </div>
  );
};

export default App;
