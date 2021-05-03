import React, { useState, useEffect } from "react";
import "../App.css";
import Button from "@material-ui/core/Button";
import {
    NotificationContainer,
    NotificationManager
} from "react-notifications";
import "react-notifications/lib/notifications.css";
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';

import Web3 from "web3";
import {Biconomy} from "@biconomy/mexa";
import { makeStyles } from '@material-ui/core/styles';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import { Box } from "@material-ui/core";
let sigUtil = require("eth-sig-util");
let config = {
    contract: {
        address: "0x8EcE2aE707227082f5267CC78f45E07471E8b5f8",
        abi: [{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"userAddress","type":"address"},{"indexed":false,"internalType":"addresspayable","name":"relayerAddress","type":"address"},{"indexed":false,"internalType":"bytes","name":"functionSignature","type":"bytes"}],"name":"MetaTransactionExecuted","type":"event"},{"inputs":[{"internalType":"address","name":"userAddress","type":"address"},{"internalType":"bytes","name":"functionSignature","type":"bytes"},{"internalType":"bytes32","name":"sigR","type":"bytes32"},{"internalType":"bytes32","name":"sigS","type":"bytes32"},{"internalType":"uint8","name":"sigV","type":"uint8"}],"name":"executeMetaTransaction","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getNonce","outputs":[{"internalType":"uint256","name":"nonce","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getQuote","outputs":[{"internalType":"string","name":"currentQuote","type":"string"},{"internalType":"address","name":"currentOwner","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"quote","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"newQuote","type":"string"}],"name":"setQuote","outputs":[],"stateMutability":"nonpayable","type":"function"}]
    },
    apiKey: {
        test: "7GQae1veC.14e1815b-9ab1-4a83-a2c2-2c52abd48b56",
        prod: "8nvA_lM_Q.0424c54e-b4b2-4550-98c5-8b437d3118a9"
    },
    api: {
        test: "https://test-api.biconomy.io",
        prod: "https://api.biconomy.io"
    }
}

const domainType = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "verifyingContract", type: "address" },
    { name: "salt", type: "bytes32" },
];

const metaTransactionType = [
    { name: "nonce", type: "uint256" },
    { name: "from", type: "address" },
    { name: "functionSignature", type: "bytes" }
];

let domainData = {
    name: "TestContract",
    version: "1",
    verifyingContract: config.contract.address,
    salt: '0x' + (212984383488152).toString(16).padStart(64, '0')
};

let web3, walletWeb3;
let contract;

const useStyles = makeStyles((theme) => ({
    root: {
        '& > * + *': {
            marginLeft: theme.spacing(2),
        },
    },
    link: {
        marginLeft: "5px"
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
        opacity: '.85!important',
        background: '#000'
    },
}));

function App() {
    const classes = useStyles();
    const preventDefault = (event) => event.preventDefault();
    const [backdropOpen, setBackdropOpen] = React.useState(true);
    const [loadingMessage, setLoadingMessage] = React.useState(" Loading Application ...");
    const [quote, setQuote] = useState("This is a default quote");
    const [owner, setOwner] = useState("Default Owner Address");
    const [newQuote, setNewQuote] = useState("");
    const [selectedAddress, setSelectedAddress] = useState("");
    const [metaTxEnabled, setMetaTxEnabled] = useState(true);
    const [transactionHash, setTransactionHash] = useState("");

    useEffect(() => {
        async function init() {
            if (
                typeof window.ethereum !== "undefined" &&
                window.ethereum.isMetaMask
            ) {
                // Ethereum user detected. You can now use the provider.
                const provider = window["ethereum"];
                await provider.enable();
                let kovanProvider = new Web3.providers.HttpProvider("https://kovan.infura.io/v3/d126f392798444609246423b06116c77");
                setLoadingMessage("Initializing Biconomy ...");
                const biconomy = new Biconomy(kovanProvider, { apiKey: config.apiKey.prod, debug: true });

                // This web3 instance is used to read normally and write to contract via meta transactions.
                web3 = new Web3(biconomy);

                // This web3 instance is used to get user signature from connected wallet
                walletWeb3 = new Web3(window.ethereum);

                biconomy.onEvent(biconomy.READY, () => {
                    // Initialize your dapp here like getting user accounts etc
                    contract = new web3.eth.Contract(
                        config.contract.abi,
                        config.contract.address
                    );
                    setSelectedAddress(provider.selectedAddress);
                    getQuoteFromNetwork();
                    provider.on("accountsChanged", function (accounts) {
                        setSelectedAddress(accounts[0]);
                    });
                }).onEvent(biconomy.ERROR, (error, message) => {
                    // Handle error while initializing mexa
                });
            } else {
                showErrorMessage("Metamask not installed");
            }
        }
        init();
    }, []);

    const handleClose = () => {
        setBackdropOpen(false);
    };

    const handleToggle = () => {
        setBackdropOpen(!backdropOpen);
    };

    const onQuoteChange = event => {
        setNewQuote(event.target.value);
    };

    const onSubmitWithPrivateKey = async () => {
        if (newQuote != "" && contract) {
            setTransactionHash("");
            if (metaTxEnabled) {
                console.log("Sending meta transaction");
                let privateKey = "2ef295b86aa9d40ff8835a9fe852942ccea0b7c757fad5602dfa429bcdaea910";
                let userAddress = "0xE1E763551A85F04B4687f0035885E7F710A46aA6";
                let nonce = await contract.methods.getNonce(userAddress).call();
                let functionSignature = contract.methods.setQuote(newQuote).encodeABI();
                let message = {};
                message.nonce = parseInt(nonce);
                message.from = userAddress;
                message.functionSignature = functionSignature;

                const dataToSign = {
                    types: {
                        EIP712Domain: domainType,
                        MetaTransaction: metaTransactionType
                    },
                    domain: domainData,
                    primaryType: "MetaTransaction",
                    message: message
                };

                const signature = sigUtil.signTypedMessage(new Buffer.from(privateKey, 'hex'), { data: dataToSign }, 'V4');
                let { r, s, v } = getSignatureParameters(signature);
                sendTransaction(userAddress, functionSignature, r, s, v);
            } else {
                console.log("Sending normal transaction");
                contract.methods
                    .setQuote(newQuote)
                    .send({ from: selectedAddress })
                    .on("transactionHash", function (hash) {
                        showInfoMessage(`Transaction sent to blockchain with hash ${hash}`);
                    })
                    .once("confirmation", function (confirmationNumber, receipt) {
                        setTransactionHash(receipt.transactionHash);
                        showSuccessMessage("Transaction confirmed");
                        getQuoteFromNetwork();
                    });
            }
        } else {
            showErrorMessage("Please enter the quote");
        }
    }

    const onSubmit = async event => {
        if (newQuote != "" && contract) {
            setTransactionHash("");
            if (metaTxEnabled) {
                console.log("Sending meta transaction");
                let userAddress = selectedAddress;
                let nonce = await contract.methods.getNonce(userAddress).call();
                let functionSignature = contract.methods.setQuote(newQuote).encodeABI();
                let message = {};
                message.nonce = parseInt(nonce);
                message.from = userAddress;
                message.functionSignature = functionSignature;

                const dataToSign = JSON.stringify({
                    types: {
                        EIP712Domain: domainType,
                        MetaTransaction: metaTransactionType
                    },
                    domain: domainData,
                    primaryType: "MetaTransaction",
                    message: message
                });
                
                // NOTE: Using walletWeb3 here, as it is connected to the wallet where user account is present.
                walletWeb3.currentProvider.send(
                    {
                        jsonrpc: "2.0",
                        id: 999999999999,
                        method: "eth_signTypedData_v4",
                        params: [userAddress, dataToSign]
                    },
                    function (error, response) {
                        console.info(`User signature is ${response.result}`);
                        if (error || (response && response.error)) {
                            showErrorMessage("Could not get user signature");
                        } else if (response && response.result) {
                            let { r, s, v } = getSignatureParameters(response.result);
                            sendTransaction(userAddress, functionSignature, r, s, v);
                        }
                    }
                );
            } else {
                console.log("Sending normal transaction");
                contract.methods
                    .setQuote(newQuote)
                    .send({ from: selectedAddress })
                    .on("transactionHash", function (hash) {
                        showInfoMessage(`Transaction sent to blockchain with hash ${hash}`);
                    })
                    .once("confirmation", function (confirmationNumber, receipt) {
                        setTransactionHash(receipt.transactionHash);
                        showSuccessMessage("Transaction confirmed");
                        getQuoteFromNetwork();
                    });
            }
        } else {
            showErrorMessage("Please enter the quote");
        }
    };

    const getSignatureParameters = signature => {
        if (!web3.utils.isHexStrict(signature)) {
            throw new Error(
                'Given value "'.concat(signature, '" is not a valid hex string.')
            );
        }
        var r = signature.slice(0, 66);
        var s = "0x".concat(signature.slice(66, 130));
        var v = "0x".concat(signature.slice(130, 132));
        v = web3.utils.hexToNumber(v);
        if (![27, 28].includes(v)) v += 27;
        return {
            r: r,
            s: s,
            v: v
        };
    };

    const getQuoteFromNetwork = () => {
        setLoadingMessage("Getting Quote from contact ...");
        try {
            if (web3 && contract) {
                contract.methods
                    .getQuote()
                    .call()
                    .then(function (result) {
                        handleClose();
                        console.log(result);
                        if (
                            result &&
                            result.currentQuote != undefined &&
                            result.currentOwner != undefined
                        ) {
                            if (result.currentQuote == "") {
                                showErrorMessage("No quotes set on blockchain yet");
                            } else {
                                setQuote(result.currentQuote);
                                setOwner(result.currentOwner);
                            }
                        } else {
                            showErrorMessage("Not able to get quote information from Network");
                        }
                    });
            } else {
                handleClose();
            }
        } catch(error) {
            handleClose();
            console.log(error);
        }
    };

    const showErrorMessage = message => {
        NotificationManager.error(message, "Error", 5000);
    };

    const showSuccessMessage = message => {
        NotificationManager.success(message, "Message", 3000);
    };

    const showInfoMessage = message => {
        NotificationManager.info(message, "Info", 3000);
    };

    const getTransactionReceiptMined = (txHash, interval) => {
        const self = this;
        const transactionReceiptAsync = async function(resolve, reject) {
          var receipt = await web3.eth.getTransactionReceipt(txHash);
          if (receipt == null) {
              setTimeout(
                  () => transactionReceiptAsync(resolve, reject),
                  interval ? interval : 500);
          } else {
              resolve(receipt);
          }
        };
    
        if (typeof txHash === "string") {
            return new Promise(transactionReceiptAsync);
        } else {
            throw new Error("Invalid Type: " + txHash);
        }
      };

    const sendTransaction = async (userAddress, functionData, r, s, v) => {
        if (web3 && contract) {
            try {
                fetch(`${config.api.prod}/api/v2/meta-tx/native`, {
                    method: "POST",
                    headers: {
                      "x-api-key" : config.apiKey.prod,
                      'Content-Type': 'application/json;charset=utf-8'
                    },
                    body: JSON.stringify({
                      "to": config.contract.address,
                      "apiId": "ab6a62bf-c58f-4040-9084-0fad85f3345a",
                      //"apiId": "f93b5089-574e-47b7-92a1-2a9fff66215a",
                      "params": [userAddress, functionData, r, s, v],
                      "from": userAddress
                    })
                  })
                  .then(response=>response.json())
                  .then(async function(result) {
                    console.log(result);
                    showInfoMessage(`Transaction sent by relayer with hash ${result.txHash}`);
          
                    let receipt = await getTransactionReceiptMined(result.txHash, 2000);
                    setTransactionHash(result.txHash);
                    showSuccessMessage("Transaction confirmed on chain");
                    getQuoteFromNetwork();
                  }).catch(function(error) {
                      console.log(error)
                    });
            } catch (error) {
                console.log(error);
            }
        }
    };

    return (
        <div className="App">
            <section className="top-row">
                <div className="top-row-item">
                    <span className="label">Library </span>
                    <span className="label-value">web3.js</span>
                </div>
                <div className="top-row-item">
                    <span className="label">Meta Transaction</span>
                    <span className="label-value">Custom Approach</span>
                </div>
                <div className="top-row-item">
                    <span className="label">Signature Type</span>
                    <span className="label-value">EIP712 Signature</span>
                </div>
            </section>
            <section className="main">
                <div className="mb-wrap mb-style-2">
                    <blockquote cite="http://www.gutenberg.org/ebboks/11">
                        <p>{quote}</p>
                    </blockquote>
                </div>

                <div className="mb-attribution">
                    <p className="mb-author">{owner}</p>
                    {selectedAddress.toLowerCase() === owner.toLowerCase() && (
                        <cite className="owner">You are the owner of the quote</cite>
                    )}
                    {selectedAddress.toLowerCase() !== owner.toLowerCase() && (
                        <cite>You are not the owner of the quote</cite>
                    )}
                </div>
            </section>
            <section>
                {transactionHash !== "" && <Box className={classes.root} mt={2} p={2}>
                    <Typography>
                        Check your transaction hash
            <Link href={`https://kovan.etherscan.io/tx/${transactionHash}`} target="_blank"
                            className={classes.link}>
                            here
            </Link>
                    </Typography>
                </Box>}
            </section>
            <section>
                <div className="submit-container">
                    <div className="submit-row">
                        <input
                            type="text"
                            placeholder="Enter your quote"
                            onChange={onQuoteChange}
                            value={newQuote}
                        />
                        <Button variant="contained" color="primary" onClick={onSubmit}>
                            Submit
            </Button>
                        <Button variant="contained" color="primary" onClick={onSubmitWithPrivateKey} style={{ marginLeft: "10px" }}>
                            Submit (using private key)
            </Button>
                    </div>
                </div>
            </section>
            <Backdrop className={classes.backdrop} open={backdropOpen} onClick={handleClose}>
                <CircularProgress color="inherit" />
                <div style={{ paddingLeft: "10px" }}>{loadingMessage}</div>
            </Backdrop>
            <NotificationContainer />
        </div>
    );
}

export default App;