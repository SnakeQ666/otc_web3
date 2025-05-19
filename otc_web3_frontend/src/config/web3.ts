import { http } from 'wagmi';
import { mainnet, sepolia,localhost} from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// 支持的链配置
export const chains = [mainnet, sepolia,localhost];

// 支持的钱包配置
export const connectors = [
  injected(),
];

// 传输配置
export const transports = {
  [mainnet.id]: http(),
  [sepolia.id]: http(),
  [localhost.id]: http(),
};