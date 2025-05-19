import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAccount, getBalance } from 'wagmi/actions';

interface Web3Store {
  isConnected: boolean;
  address: string | undefined;
  balance: bigint | undefined;
  setIsConnected: (isConnected: boolean) => void;
  setAddress: (address: string | undefined) => void;
  setBalance: (balance: bigint | undefined) => void;
  updateBalance: () => Promise<void>;
}

export const useWeb3Store = create<Web3Store>(
  persist(
    (set) => ({
      isConnected: false,
      address: undefined,
      balance: undefined,
      setIsConnected: (isConnected) => set({ isConnected }),
      setAddress: (address) => set({ address }),
      setBalance: (balance) => set({ balance }),
      updateBalance: async () => {
        const account = getAccount();
        if (account?.address) {
          const balance = await getBalance({ address: account.address });
          set({ balance: balance.value });
        }
      },
    }),
    {
      name: 'web3-storage',
    }
  )
);