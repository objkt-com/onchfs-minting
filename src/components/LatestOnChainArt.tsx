import React, { useEffect, useState } from 'react';
import config from '../networkConfig';

type NetworkType = keyof typeof config;

interface Token {
  token_id: string;
  fa_contract: string;
  creators: { creator_address: string }[];
  name: string;
}

interface LatestOnChainArtProps {
  networkType: NetworkType;
}

const LatestOnChainArt: React.FC<LatestOnChainArtProps> = ({ networkType }) => {
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    const fetchTokens = async () => {
      const query = `
        query MyQuery {
          token(
            where: {fa: {collection_type: {_eq: "open_edition"}}, artifact_uri: {_like: "onchfs://%"}},
            order_by: {pk: desc}
            ) {
            token_id
            fa_contract
            creators {
              creator_address
            }
            name
          }
        }
      `;

      try {
        const response = await fetch(config[networkType].objktGraphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        const data = await response.json();
        setTokens(data.data.token);
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }
    };

    fetchTokens();
  }, [networkType]);

  const getImageUrl = (faContract: string, tokenId: string) => {
    const baseUrl = networkType === 'mainnet'
      ? 'https://assets.objkt.media/file/assets-003'
      : 'https://assets.ghostnet.objkt.media/file/assets-ghostnet';
    return `${baseUrl}/${faContract}/${tokenId}/thumb400`;
  };

  const getTokenUrl = (faContract: string, tokenId: string) => {
    const baseUrl = networkType === 'mainnet' ? 'https://objkt.com' : 'https://ghostnet.objkt.com';
    return `${baseUrl}/tokens/${faContract}/${tokenId}`;
  };

  return (
    <div className="latest-on-chain-art">
      <h2>Latest On-Chain Art on objkt</h2>
      <div className="token-grid">
        {tokens.map((token) => (
          <a
            key={`${token.fa_contract}-${token.token_id}`}
            href={getTokenUrl(token.fa_contract, token.token_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="token-card"
          >
            <img src={getImageUrl(token.fa_contract, token.token_id)} alt={token.name} />
            <div className="token-info">
              <h3>{token.name}</h3>
              <p>Artist: {token.creators[0]?.creator_address}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default LatestOnChainArt;