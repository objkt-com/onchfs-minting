import React, { useEffect, useState } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { stringToBytes } from '@taquito/utils';
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

interface Token {
  token_id: number;
  fa_contract: string;
  creators?: string[];
}

interface Collection {
  contract: string;
  name: string;
  logo: string;
  tokens: Token[];
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
                tokens(where: {artifact_uri: {_like: "onchfs://%"}}) {
                  token_id
                  fa_contract 
                  creators {
                        creator_address
                    }
                }
              }
            }
          `,
          variables: { address: userAddress },
        });

        const collectionsWithFilteredTokens = response.data.data.fa.map((collection: Collection) => ({
          ...collection,
          tokens: collection.tokens.filter((token: Token) => !token.creators || token.creators.length === 0),
        }));

        setCollections(collectionsWithFilteredTokens);
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

  const fixTokenMetadata = async (token_id: number, fa_contract: string) => {
    if (!tezos || !userAddress) {
      throw new Error('Tezos is not initialized or user address is missing');
    }

    try {
      const nftContract = await tezos.wallet.at(fa_contract);
      const tokenMetadataStorage = await nftContract.storage() as any;
      const tokenMetadataBigMap = tokenMetadataStorage.token_metadata;
      
      // Get the token metadata from the bigMap
      const tokenMetadata = await tokenMetadataBigMap.get(token_id);
      let existingTokenInfo: { [key: string]: string } = {};
      tokenMetadata.token_info.forEach((v: string, k: string) => {
        existingTokenInfo[k] = v;
      });

      const updatedTokenInfo = {
        ...existingTokenInfo,
        creators: stringToBytes(`["${userAddress}"]`),
      };

      const op = await nftContract.methodsObject.update_token_metadata([{
        token_id,
        token_info: updatedTokenInfo,
      }]).send();

      await op.confirmation(1);
      alert(`Token metadata fixed successfully! Operation hash: ${op.opHash}`);
    } catch (error) {
      console.error('Error fixing token metadata:', error);
      alert('An error occurred while fixing token metadata. Please try again later.');
    }
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
              {collection.tokens.length > 0 && (
                <div className="tokens-with-missing-creators">
                  <h3>Tokens with Missing Creators</h3>
                  <ul>
                    {collection.tokens.map((token) => (
                      <li key={token.token_id}>
                        Token ID: {token.token_id}, FA Contract: {token.fa_contract}
                        <button onClick={() => fixTokenMetadata(token.token_id, token.fa_contract)}>
                          Fix Metadata
                        </button>
                      </li>
                    ))}
                  </ul>  
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CollectionDisplay;