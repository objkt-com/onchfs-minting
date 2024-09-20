export interface NetworkConfig {
  onchfsContractAddress: string;
  rpcUrl: string;
  objktGraphqlUrl: string;
}

interface Config {
  ghostnet: NetworkConfig;
  mainnet: NetworkConfig;
}

const config: Config = {
mainnet: {
    onchfsContractAddress: "KT1Ae7dT1gsLw2tRnUMXSCmEyF74KVkM6LUo",
    rpcUrl: "https://rpc.tzkt.io/mainnet",
    objktGraphqlUrl: "https://data.objkt.com/v3/graphql",
    },
  ghostnet: {
    onchfsContractAddress: "KT1FA8AGGcJha6S6MqfBUiibwTaYhK8u7s9Q",
    rpcUrl: "https://rpc.tzkt.io/ghostnet",
    objktGraphqlUrl: "https://data.ghostnet.objkt.com/v3/graphql",
  },
};

export default config;