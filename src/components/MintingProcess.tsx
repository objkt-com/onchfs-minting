import React, { useState, useCallback } from 'react';
import { TezosToolkit, WalletOperation } from '@taquito/taquito';
import { keccak256 } from 'js-sha3';
import { stringToBytes } from '@taquito/utils';
import { NetworkConfig } from '../networkConfig';
import hpackEncodedHeadersMap from './hpack'

type NetworkType = 'ghostnet' | 'mainnet';

interface MintingProcessProps {
  tezos: TezosToolkit | null;
  userAddress: string | null;
  selectedCollection: string | null;
  collectionLogo: string | null;
  network: NetworkType;
  config: NetworkConfig;
}

interface Attribute {
  name: string;
  value: string;
}

interface AttributeEditorProps {
  attributes: Attribute[];
  onChange: (attributes: Attribute[]) => void;
}

const AttributeEditor: React.FC<AttributeEditorProps> = ({ attributes, onChange }) => {
  const addAttribute = () => {
    onChange([...attributes, { name: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    const newAttributes = [...attributes];
    newAttributes.splice(index, 1);
    onChange(newAttributes);
  };

  const updateAttribute = (index: number, field: 'name' | 'value', value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    onChange(newAttributes);
  };

  return (
    <div className="attribute-editor">
      {attributes.map((attr, index) => (
        <div key={index} className="attribute-row">
          <input
            type="text"
            placeholder="Name"
            value={attr.name}
            onChange={(e) => updateAttribute(index, 'name', e.target.value)}
          />
          <input
            type="text"
            placeholder="Value"
            value={attr.value}
            onChange={(e) => updateAttribute(index, 'value', e.target.value)}
          />
          <button type="button" onClick={() => removeAttribute(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={addAttribute}>Add Attribute</button>
    </div>
  );
};

const MintingProcess: React.FC<MintingProcessProps> = ({ tezos, userAddress, selectedCollection, collectionLogo, network, config }) => {
  const [nftConfig, setNftConfig] = useState({
    name: '',
    description: '',
    royalties: 10,
    tags: '',
    attributes: [] as Attribute[],
    license: 'No License / All Rights Reserved',
    numberOfEditions: 1,
    isOpenEdition: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [mintedToken, setMintedToken] = useState<{ fa_contract: string, token_id: number } | null>(null);

  const getObjktUrl = (network: NetworkType) => {
    return network === 'ghostnet' ? 'https://ghostnet.objkt.com' : 'https://objkt.com';
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setNftConfig(prevConfig => ({ ...prevConfig, [name]: checked }));
    } else {
      setNftConfig(prevConfig => ({ ...prevConfig, [name]: value }));
    }
  };

  const handleAttributesChange = (newAttributes: Attribute[]) => {
    setNftConfig(prevConfig => ({ ...prevConfig, attributes: newAttributes }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Calculate estimated cost
      const costPerByte = 8.06 / 32000;
      const estimatedCost = (selectedFile.size * costPerByte).toFixed(6);
      setEstimatedCost(parseFloat(estimatedCost));
    }
  };

  const resetForm = () => {
    setNftConfig({
      name: '',
      description: '',
      royalties: 10,
      tags: '',
      attributes: [],
      license: 'No License / All Rights Reserved',
      numberOfEditions: 1,
      isOpenEdition: false,
    });
    setFile(null);
    setProgress(0);
    setStatus('');
    setError('');
    setEstimatedCost(null);
    setMintedToken(null);
  };

  const readChunks = useCallback((file: File, chunkSize: number): Promise<Uint8Array[]> => {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const reader = new FileReader();
      let offset = 0;

      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        if (e.target?.result) {
          chunks.push(new Uint8Array(e.target.result as ArrayBuffer));
          offset += chunkSize;
          if (offset < file.size) {
            readNextChunk();
          } else {
            resolve(chunks);
          }
        }
      };

      reader.onerror = (error) => reject(error);

      readNextChunk();
    });
  }, []);

  const uploadChunk = useCallback(async (chunk: Uint8Array, chunkHash: string) => {
    if (!tezos) {
      throw new Error('Tezos is not initialized');
    }
    console.log(chunkHash)

    const onchfsContract = await tezos.wallet.at(config.onchfsContractAddress);

    try {
      await onchfsContract.contractViews.read_chunk(chunkHash).executeView({ viewCaller: 'tz1burnburnburnburnburnburnburjAYjjX' });
      return null; // Chunk already exists
    } catch {
        console.log("minting file")
      const op = await onchfsContract.methodsObject.write_chunk(chunk).send();
      await op.confirmation(1);
      return op.opHash;
    }
  }, [tezos, config.onchfsContractAddress]);

  const createFileInode = useCallback(async (chunkHashes: string[], encodedHeaders: Uint8Array) => {
    if (!tezos) {
      throw new Error('Tezos is not initialized');
    }

    const onchfsContract = await tezos.wallet.at(config.onchfsContractAddress);
    const op = await onchfsContract.methodsObject.create_file(
      {
        chunk_pointers: chunkHashes.map(hash => `0x${hash}`),
        metadata: encodedHeaders,
      }
    ).send();
    await op.confirmation(1);
    return op.opHash;
  }, [tezos, config.onchfsContractAddress]);

  const checkFileExists = useCallback(async (fileCID: string) => {
    if (!tezos) {
      throw new Error('Tezos is not initialized');
    }

    const onchfsContract = await tezos.wallet.at(config.onchfsContractAddress);
    try {
      await onchfsContract.contractViews.read_file(fileCID).executeView({ viewCaller: "tz1burnburnburnburnburnburnburjAYjjX" });
      return true;
    } catch {
      return false;
    }
  }, [tezos, config.onchfsContractAddress]);

  const getLastTokenId = useCallback(async () => {
    if (!tezos) {
      throw new Error('Tezos is not initialized');
    }

    try {
      const nftContract = await tezos.wallet.at(selectedCollection as string);
      const storage: any = await nftContract.storage();
      return storage.last_token_id.toNumber();
    } catch (error) {
      console.error('Error in getLastTokenId:', error);
      throw new Error('Failed to get the last token ID. The contract might not support this operation.');
    }
  }, [tezos, selectedCollection]);

  const mintNFT = useCallback(async (artifactUri: string, metadata: any) => {
    if (!tezos || !userAddress) {
      throw new Error('Tezos is not initialized or user address is missing');
    }

    const nftContract = await tezos.wallet.at(selectedCollection as string);
    const createTokenParams = {
      name: stringToBytes(metadata.name),
      description: stringToBytes(metadata.description),
      artifactUri: stringToBytes(artifactUri),
      creators: stringToBytes(`["${userAddress}"]`),
      royalties: stringToBytes(JSON.stringify({
        decimals: 4,
        shares: { [userAddress]: metadata.royalties * 100 }
      })),
      // Optional fields
      ...(metadata.tags && { tags: stringToBytes(JSON.stringify(metadata.tags)) }),
      ...(metadata.formats && { formats: stringToBytes(JSON.stringify(metadata.formats)) }),
      ...(metadata.attributes && { attributes: stringToBytes(JSON.stringify(metadata.attributes)) }),
      ...(metadata.license && { license: stringToBytes(metadata.license) }),
    };

    const batch = tezos.wallet.batch();
    batch.withContractCall(nftContract.methodsObject.create_token(createTokenParams));

    if (!nftConfig.isOpenEdition && nftConfig.numberOfEditions > 0) {
      const lastTokenId = await getLastTokenId();
      const newTokenId = lastTokenId + 1; // The ID of the token we're creating

      batch.withContractCall(nftContract.methodsObject.mint({
        mint_items: [{ amount: nftConfig.numberOfEditions, to_: userAddress }],
        token_id: newTokenId
      }));

      batch.withContractCall(nftContract.methodsObject.lock({
        metadata: false,
        mint: true,
        token_id: newTokenId
      }));
    }

    const batchOp = await batch.send();
    await batchOp.confirmation(1);
    return batchOp.opHash;
  }, [tezos, userAddress, selectedCollection, nftConfig.isOpenEdition, nftConfig.numberOfEditions, getLastTokenId]);

  const concatenateUint8Arrays = (arrays: Uint8Array[]): Uint8Array => {
    const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  };

  const hexToUint8Array = (hex: string): Uint8Array => {
    return new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  };

  const handleMint = useCallback(async () => {
    if (!tezos || !userAddress || !file || !selectedCollection) {
      setError('Please connect your wallet, select a file, and ensure a collection is selected.');
      return;
    }

    setStatus('Starting minting process...');
    setProgress(0);
    setError('');

    try {
      const chunkSize = 32000; // ~32KB
      const chunks = await readChunks(file, chunkSize);
      const totalChunks = chunks.length;
      const totalSteps = totalChunks + 2; // n_chunks + 2 for file inode creation and NFT minting

      const chunkHashes: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunk = chunks[i];
        const chunkHash = keccak256(chunk);
        chunkHashes.push(chunkHash);

        setStatus(`Uploading chunk ${i + 1}/${totalChunks}...`);
        const opHash = await uploadChunk(chunk, chunkHash);
        if (opHash) {
          setStatus(`Chunk ${i + 1} uploaded. Operation hash: ${opHash}`);
        } else {
          setStatus(`Chunk ${i + 1} already exists.`);
        }

        setProgress(((i + 1) / totalSteps) * 100);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second between transactions
      }

      setStatus('Creating file inode...');
      const encodedHeaders = hpackEncodedHeadersMap[file.type]

      // Compute file CID
      const fileDataHash = hexToUint8Array(keccak256(concatenateUint8Arrays(chunks)));
      const metadataHash = hexToUint8Array(keccak256(encodedHeaders));
      const fileCID = keccak256(concatenateUint8Arrays([new Uint8Array([1]), fileDataHash, metadataHash]));
      const fileCIDHex = fileCID;

      // Check if file already exists
      setStatus('Checking if file already exists...');
      const fileExists = await checkFileExists(fileCIDHex);
      
      if (!fileExists) {
        const inodeHash = await createFileInode(chunkHashes, encodedHeaders);
        setStatus(`File inode created. Operation hash: ${inodeHash}`);
      } else {
        setStatus('File already exists. Skipping inode creation.');
      }

      setProgress(((totalChunks + 1) / totalSteps) * 100);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second between transactions
      setStatus('Minting NFT...');

      const artifactUri = `onchfs://${fileCIDHex}`;
      
      const nftMetadata = {
        name: nftConfig.name,
        description: nftConfig.description,
        royalties: nftConfig.royalties,
        tags: nftConfig.tags.split(',').map(tag => tag.trim()),
        attributes: nftConfig.attributes,
        license: nftConfig.license,
        formats: [{ uri: artifactUri, mimeType: file.type }],
      };
      console.log(file.type)

      const mintHash = await mintNFT(artifactUri, nftMetadata);
      setStatus(`NFT minted successfully! Operation hash: ${mintHash}`);

      setProgress(100);
      setStatus('Minting process completed successfully.');

      // Set minted token information
      const lastTokenId = await getLastTokenId();
      setMintedToken({ fa_contract: selectedCollection, token_id: lastTokenId });

    } catch (error) {
      console.error('Error during minting process:', error);
      setError(`Error: ${(error as Error).message}`);
      setStatus('Minting process failed.');
    }
  }, [tezos, userAddress, file, nftConfig, selectedCollection, network, config, readChunks, uploadChunk, createFileInode, checkFileExists, mintNFT, getLastTokenId]);

  const isFormValid = () => {
    return (
      nftConfig.name.trim() !== '' &&
      nftConfig.description.trim() !== '' &&
      nftConfig.royalties >= 0 &&
      nftConfig.royalties <= 100 &&
      file !== null &&
      selectedCollection !== null &&
      (nftConfig.isOpenEdition || nftConfig.numberOfEditions > 0)
    );
  };

  return (
    <div className="minting-process">
      <h2>NFT Minting Process</h2>
      {selectedCollection && (
        <div className="selected-collection">
          {collectionLogo && (
            <img
              src={collectionLogo}
              alt={`${selectedCollection} logo`}
              style={{ width: '30px', height: '30px', marginRight: '10px' }}
            />
          )}
          <h3>Collection: {selectedCollection}</h3>
        </div>
      )}
      <form>
        <div>
          <label htmlFor="file">File:</label>
          <input type="file" id="file" onChange={handleFileChange} required />
          {estimatedCost !== null && (
            <p className="estimated-cost">
              Estimated cost to store: <strong>ꜩ {estimatedCost.toFixed(6)}</strong>
            </p>
          )}
        </div>
        <div>
          <label htmlFor="name">Name:</label>
          <input type="text" id="name" name="name" value={nftConfig.name} onChange={handleConfigChange} required />
        </div>
        <div>
          <label htmlFor="description">Description:</label>
          <textarea id="description" name="description" value={nftConfig.description} onChange={handleConfigChange} required />
        </div>
        <div>
          <label htmlFor="royalties">Royalties (%):</label>
          <input type="number" id="royalties" name="royalties" value={nftConfig.royalties} onChange={handleConfigChange} min="0" max="100" required />
        </div>
        <div>
          <label htmlFor="tags">Tags (comma-separated):</label>
          <input type="text" id="tags" name="tags" value={nftConfig.tags} onChange={handleConfigChange} />
        </div>
        <div>
          <label>Attributes:</label>
          <AttributeEditor attributes={nftConfig.attributes} onChange={handleAttributesChange} />
        </div>
        <div>
          <label htmlFor="license">License:</label>
          <input type="text" id="license" name="license" value={nftConfig.license} onChange={handleConfigChange} />
        </div>
        <div>
          <label htmlFor="isOpenEdition">Open Edition:</label>
          <input
            type="checkbox"
            id="isOpenEdition"
            name="isOpenEdition"
            checked={nftConfig.isOpenEdition}
            onChange={handleConfigChange}
          />
        </div>
        {!nftConfig.isOpenEdition && (
          <div>
            <label htmlFor="numberOfEditions">Number of Editions:</label>
            <input
              type="number"
              id="numberOfEditions"
              name="numberOfEditions"
              value={nftConfig.numberOfEditions}
              onChange={handleConfigChange}
              min="1"
              required
            />
          </div>
        )}
      </form>
      <button onClick={handleMint} disabled={!tezos || !userAddress || !isFormValid()}>Mint NFT</button>
      <div className="minting-progress">
        <h3>Minting Progress</h3>
        <progress value={progress} max="100"></progress>
        <p>{status}</p>
        {error && <p className="error-message">{error}</p>}
        {mintedToken && (
          <p>
            Minted Token: <a href={`${getObjktUrl(network)}/tokens/${mintedToken.fa_contract}/${mintedToken.token_id}`} target="_blank" rel="noopener noreferrer">
              View on Objkt
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default MintingProcess;
