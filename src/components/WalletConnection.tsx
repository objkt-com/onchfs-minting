import React from 'react';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { NetworkType } from '@airgap/beacon-types';
import { BeaconError, AbortedBeaconError } from '@airgap/beacon-sdk';
import config from '../networkConfig';

type NetworkTypeState = 'ghostnet' | 'mainnet';

interface WalletConnectionProps {
  wallet: BeaconWallet | null;
  setWallet: React.Dispatch<React.SetStateAction<BeaconWallet | null>>;
  userAddress: string | null;
  setUserAddress: React.Dispatch<React.SetStateAction<string | null>>;
  setupTezos: (wallet: BeaconWallet) => Promise<void>;
  network: NetworkTypeState;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  wallet,
  setWallet,
  userAddress,
  setUserAddress,
  setupTezos,
  network,
  error,
  setError,
}) => {
  const connectWallet = async () => {
    setError(null);
    try {
      const newWallet = new BeaconWallet({
        name: 'onchfs objkt minting prototype',
        preferredNetwork: network === 'mainnet' ? NetworkType.MAINNET : NetworkType.GHOSTNET,
      });

      await newWallet.requestPermissions({
        network: {
          type: network === 'mainnet' ? NetworkType.MAINNET : NetworkType.GHOSTNET,
          rpcUrl: config[network].rpcUrl,
        },
      });

      const activeAccount = await newWallet.client.getActiveAccount();
      if (activeAccount) {
        setWallet(newWallet);
        setUserAddress(activeAccount.address);
        await setupTezos(newWallet);
      } else {
        throw new Error('No active account');
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      
      if (error instanceof AbortedBeaconError) {
        setError('Wallet connection was aborted. Please try again if you wish to connect.');
      } else if (error instanceof BeaconError) {
        if (error.name === 'NotGrantedBeaconError') {
          setError('Permission was not granted. Please try again and approve the connection.');
        } else {
          setError(`Beacon error: ${error.description}`);
        }
      } else if (error instanceof Error) {
        setError(`Failed to connect wallet: ${error.message}`);
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      
      setWallet(null);
      setUserAddress(null);
    }
  };

  const disconnectWallet = async () => {
    if (wallet) {
      try {
        await wallet.client.removeAllAccounts();
        await wallet.client.removeAllPeers();
        await wallet.client.destroy();
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      } finally {
        setWallet(null);
        setUserAddress(null);
        setError(null);
      }
    }
  };

  return (
    <div className="wallet-connection">
      {error && <p className="error-message">{error}</p>}
      {!userAddress ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p className="wallet-address">Connected: {userAddress}</p>
          <button onClick={disconnectWallet}>Disconnect</button>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;