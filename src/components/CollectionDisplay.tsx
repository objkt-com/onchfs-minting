import React, { useEffect, useState } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import axios from 'axios';
import { NetworkConfig } from '../networkConfig';

type NetworkType = 'ghostnet' | 'mainnet';

interface CollectionDisplayProps {
  userAddress: string;
  tezos: TezosToolkit;
  onSelectCollection: (collection: string, logo: string) => void;
  network: NetworkType;
  config: NetworkConfig;
}

interface Collection {
  contract: string;
  name: string;
  logo: string;
}

const CollectionDisplay: React.FC<CollectionDisplayProps> = ({ userAddress, tezos, onSelectCollection, network, config }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.post(config.objktGraphqlUrl, {
          query: `
            query GetUserCollections($address: String!) {
              fa(where: {creator_address: {_eq: $address}, collection_type: {_eq: "open_edition"}}) {
                contract
                name
                logo
              }
            }
          `,
          variables: { address: userAddress },
        });

        setCollections(response.data.data.fa);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching collections:', error);
        setError('Failed to fetch collections. Please try again later.');
        setLoading(false);
      }
    };

    if (userAddress) {
      fetchCollections();
    }
  }, [userAddress, config.objktGraphqlUrl]);

  const formatLogoUrl = (logo: string) => {
    if (logo.startsWith('ipfs://')) {
      const cid = logo.replace('ipfs://', '');
      return network === 'mainnet'
        ? `https://assets.objkt.media/file/assets-003/${cid}/thumb400`
        : `https://assets.ghostnet.objkt.media/file/assets-ghostnet/${cid}/thumb400`;
    }
    return logo;
  };

  if (loading) {
    return <div className="loading">Loading collections...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="collections-display">
      <h2>Your Collections</h2>
      {collections.length === 0 ? (
        <p>No collections found.</p>
      ) : (
        <ul className="collection-list">
          {collections.map((collection, index) => (
            <li key={index} className="collection-item">
              <img src={formatLogoUrl(collection.logo)} alt={collection.name} className="collection-logo" />
              <div className="collection-info">
                <span className="collection-name">{collection.name}</span>
                <span className="collection-contract">Contract: {collection.contract}</span>
                <button onClick={() => onSelectCollection(collection.contract, formatLogoUrl(collection.logo))}>
                  Select Collection
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CollectionDisplay;