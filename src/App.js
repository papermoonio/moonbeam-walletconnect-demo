import "./App.css";
import logo from "./logo.png";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import { useState, useEffect } from "react";
import styled from "styled-components";
import { ethers } from "ethers";
import { SUPPORTED_NETWORKS } from "./helpers/networks";

const Wrapper = styled.div`
  font-family: "Varela Round", sans-serif;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 10em;
`;

const Header = styled.h1`
  font-size: 2em;
  margin-bottom: 1em;
`;

const LoadedData = styled.div`
  margin: 1em;
  align-self: center;
`;

const Data = styled.p`
  font-size: 1.2em;
`;

const Button = styled.button`
  padding: 1em;
  background: #53cbc9;
  font-size: 1em;
  border: none;
  border-radius: 0.3em;
  font-family: "Varela Round", sans-serif;
  :hover {
    transform: scale(1.1);
    cursor: pointer;
  }
`;

const OutlinedButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #53cbc9;
  display: flex;
  margin: auto;
  margin-top: 3em;
`;

function App() {
  const [connector, setConnector] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [account, setAccount] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(false);
  const [network, setNetwork] = useState(null);
  const [symbol, setSymbol] = useState(null);

  useEffect(() => {
    const onConnect = async (chainId, connectedAccount) => {
      setAccount(connectedAccount);
      setChainId(chainId);

      // get chain data
      const networkData = SUPPORTED_NETWORKS.filter(
        (chain) => chain.chain_id === chainId
      )[0];

      if (!networkData) {
        setSupported(false);
      } else {
        setSupported(true);
        setNetwork(networkData.name);
        setSymbol(networkData.native_currency.symbol);

        // get account balance
        let provider = new ethers.providers.StaticJsonRpcProvider(
          networkData.rpc_url,
          {
            chainId,
            name: networkData.name,
          }
        );

        let balance = await provider.getBalance(connectedAccount);
        let formattedBalance = ethers.utils.formatEther(balance);

        setBalance(formattedBalance);
      }
    };

    const refreshData = async () => {
      const { chainId, accounts } = connector;
      await onConnect(chainId, accounts[0]);
      setFetching(false);
    };

    if (connector) {
      connector.on("connect", async (error, payload) => {
        const { chainId, accounts } = payload.params[0];
        await onConnect(chainId, accounts[0]);
        setFetching(false);
      });

      connector.on("disconnect", (error, payload) => {
        if (error) {
          throw error;
        }
        resetApp();
      });

      if ((!chainId || !account || !balance) && connector.connected) {
        refreshData();
      }
    }
  }, [connector, balance, chainId, account]);

  const connect = async () => {
    setFetching(true);

    // bridge url
    const bridge = "https://bridge.walletconnect.org";

    // create new connector
    const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });
    setConnector(connector);

    // check if already connected
    if (!connector.connected) {
      // create new session
      await connector.createSession();
    }
  };

  // this ensures the connection is killed on the users mobile device
  const killSession = () => {
    if (connector) {
      connector.killSession();
    }
    resetApp();
  };

  const sendTransaction = async () => {
    try {
      setError(null);
      await connector.sendTransaction({
        from: account,
        to: account,
        value: "0x1BC16D674EC80000",
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const resetApp = () => {
    setConnector(null);
    setChainId(null);
    setAccount(null);
    setFetching(false);
    setBalance(null);
    setError(null);
  };

  return (
    <Wrapper>
      <img src={logo} alt="logo" />
      <Content>
        <Header>Moonbeam WalletConnect Demo App</Header>
        {error && <div>There was an error: {error} </div>}
        {connector && !fetching ? (
          <LoadedData>
            <Data>
              <strong>Connected Account: </strong>
              {account}
            </Data>
            <Data>
              <strong>Chain ID: </strong>
              {chainId}
            </Data>
            {supported ? (
              <>
                <Data>
                  <strong>Network: </strong>
                  {network}
                </Data>
                <Data>
                  <strong>Balance: </strong>
                  {balance} {symbol}
                </Data>
                <OutlinedButton onClick={sendTransaction}>
                  Send Transaction
                </OutlinedButton>
              </>
            ) : (
              <strong>
                Network not supported. Please disconnect, switch networks, and
                connect again.
              </strong>
            )}
            <OutlinedButton onClick={killSession}>Disconnect</OutlinedButton>
          </LoadedData>
        ) : (
          <Button onClick={connect}>Connect Wallet</Button>
        )}
      </Content>
    </Wrapper>
  );
}

export default App;
