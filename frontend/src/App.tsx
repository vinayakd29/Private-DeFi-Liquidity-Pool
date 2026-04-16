import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatEther,
  keccak256,
  parseEther,
  toUtf8Bytes,
  JsonRpcProvider,
  Wallet
} from "ethers";
import "./App.css";
import { erc20Abi, poolAbi } from "./poolAbi";
import {
  createProfile,
  defaultProfile,
  loadProfiles,
  saveProfiles,
  type UserProfile
} from "./profiles";
import {
  buildDemoWithdrawInput,
  generateWithdrawProof,
  publicSignalToBytes32
} from "./zk/proof";

export function App() {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const loaded = loadProfiles();
    return loaded.length ? loaded : [defaultProfile()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const loaded = loadProfiles();
    const list = loaded.length ? loaded : [defaultProfile()];
    return list[0]!.id;
  });
  const [hideBalances, setHideBalances] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [ethBalance, setEthBalance] = useState("");
  const [tokenBalance, setTokenBalance] = useState("");
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"neutral" | "ok" | "err">("neutral");

  const [proof, setProof] = useState("0x");
  const [root, setRoot] = useState("0x");
  const [nullifierHash, setNullifierHash] = useState("0x");
  const [proving, setProving] = useState(false);

  const [gasDeposit, setGasDeposit] = useState<string | null>(null);
  const [gasWithdrawSelf, setGasWithdrawSelf] = useState<string | null>(null);
  const [gasError, setGasError] = useState<string | null>(null);

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? profiles[0],
    [profiles, activeId]
  );

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    if (profiles.length && !profiles.some((p) => p.id === activeId)) {
      setActiveId(profiles[0]!.id);
    }
  }, [profiles, activeId]);

  const patchActive = useCallback(
    (partial: Partial<UserProfile>) => {
      setProfiles((prev) =>
        prev.map((p) => (p.id === activeId ? { ...p, ...partial } : p))
      );
    },
    [activeId]
  );

  const commitmentPreview = useMemo(() => {
    if (!active?.secret) return "Enter a secret to derive commitment";
    return keccak256(toUtf8Bytes(`${active.secret}:${active.token}:${active.amount}`));
  }, [active]);

  function setMessage(text: string, kind: typeof statusKind = "neutral") {
    setStatus(text);
    setStatusKind(kind);
  }

  async function connectWallet() {
    const eth = (window as Window & { ethereum?: unknown }).ethereum;
    if (!eth) {
      setMessage("MetaMask not found in browser.", "err");
      return;
    }
    const provider = new BrowserProvider(eth as never);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    setWalletAddress(addr);
    patchActive({ recipient: addr });
    const bal = await provider.getBalance(addr);
    setEthBalance(formatEther(bal));
    setMessage("Wallet connected.", "ok");
  }

  async function claimTestFunds() {
    if (!walletAddress) {
      setMessage("Please connect your wallet first.", "err");
      return;
    }
    try {
      setMessage("Claiming test funds from local node...", "neutral");
      // Use Hardhat's default Account #0 to fund the user's actual wallet
      const provider = new JsonRpcProvider("http://127.0.0.1:8545/");
      const devWallet = new Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

      // Send 10 ETH
      const tx = await devWallet.sendTransaction({
        to: walletAddress,
        value: parseEther("10.0")
      });
      await tx.wait();

      // Mint 1000 MockTokens
      const token = new Contract(active.token, ["function mint(address to, uint256 amount) external", ...erc20Abi], devWallet);
      const mintTx = await token.mint(walletAddress, parseEther("1000"));
      await mintTx.wait();

      setMessage("Successfully claimed 10 ETH and 1000 MockTokens!", "ok");

      // Refresh balances
      const bal = await provider.getBalance(walletAddress);
      setEthBalance(formatEther(bal));
      const raw = await token.balanceOf(walletAddress);
      setTokenBalance(formatEther(raw));
    } catch (err: any) {
      setMessage(`Failed to claim funds: ${err.message}`, "err");
    }
  }

  useEffect(() => {
    async function loadTokenBal() {
      if (!walletAddress || !active?.token || active.token === ethersZeroAddr()) {
        setTokenBalance("");
        return;
      }
      const eth = (window as Window & { ethereum?: unknown }).ethereum;
      if (!eth) return;
      try {
        const provider = new BrowserProvider(eth as never);
        const t = new Contract(active.token, erc20Abi, provider);
        const raw = await t.balanceOf(walletAddress);
        setTokenBalance(formatEther(raw));
      } catch {
        setTokenBalance("");
      }
    }
    void loadTokenBal();
  }, [walletAddress, active?.token]);

  async function refreshOnChainRoot() {
    if (!active?.poolAddress) {
      setMessage("Set pool address on this profile first.", "err");
      return;
    }
    const eth = (window as Window & { ethereum?: unknown }).ethereum;
    if (!eth) {
      setMessage("Connect a wallet to read the pool.", "err");
      return;
    }
    try {
      const provider = new BrowserProvider(eth as never);
      const pool = new Contract(active.poolAddress, poolAbi, provider);
      const r = await pool.latestRoot();
      setRoot(r);
      setMessage("Latest on-chain root filled.", "ok");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not read root";
      setMessage(msg, "err");
    }
  }

  async function refreshRootFromBackend() {
    if (!active?.backendUrl) return;
    try {
      const resp = await fetch(`${active.backendUrl.replace(/\/$/, "")}/root`);
      const data = (await resp.json()) as { latestRoot?: string; error?: string };
      if (!resp.ok) {
        setMessage(data.error ?? "Backend /root failed", "err");
        return;
      }
      if (data.latestRoot) setRoot(data.latestRoot);
      setMessage("Root synced from relayer backend.", "ok");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Backend unreachable";
      setMessage(msg, "err");
    }
  }

  async function depositNote() {
    if (!active?.poolAddress) {
      setMessage("Enter pool contract address.", "err");
      return;
    }
    const eth = (window as Window & { ethereum?: unknown }).ethereum;
    if (!eth) {
      setMessage("MetaMask not found in browser.", "err");
      return;
    }
    try {
      setMessage("Submitting deposit…", "neutral");
      const provider = new BrowserProvider(eth as never);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      setWalletAddress(signerAddress);

      const parsedAmount = parseEther(active.amount);
      const pool = new Contract(active.poolAddress, poolAbi, signer);
      const tokenContract = new Contract(active.token, erc20Abi, signer);
      const commitment = keccak256(toUtf8Bytes(`${active.secret}:${active.token}:${active.amount}`));

      const approveTx = await tokenContract.approve(active.poolAddress, parsedAmount);
      await approveTx.wait();

      const depositTx = await pool.deposit(active.token, parsedAmount, commitment);
      await depositTx.wait();
      setMessage(`Deposit confirmed. Tx: ${depositTx.hash}`, "ok");
      await refreshOnChainRoot();
      
      // Refresh balances
      try {
        setTokenBalance(formatEther(await tokenContract.balanceOf(signerAddress)));
        setEthBalance(formatEther(await provider.getBalance(signerAddress)));
      } catch (e) {}
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      setMessage(message, "err");
    }
  }

  async function runGenerateProof() {
    if (!active?.recipient || active.recipient.length !== 42) {
      setMessage("Set a valid recipient address.", "err");
      return;
    }
    try {
      setProving(true);
      setMessage("Generating Groth16 proof in-browser (may take ~10–30s)…", "neutral");
      const amountWei = parseEther(active.amount);
      const input = buildDemoWithdrawInput({
        secret: active.secret || "default-secret",
        tokenAddress: active.token,
        amountWei,
        recipientAddress: active.recipient
      });
      const { proofBytes, publicSignals } = await generateWithdrawProof(input);
      if (publicSignals.length < 5) {
        setMessage("Unexpected public signals from prover.", "err");
        return;
      }
      setProof(proofBytes);
      setRoot(publicSignalToBytes32(publicSignals[0]));
      setNullifierHash(publicSignalToBytes32(publicSignals[1]));
      setMessage("Proof generated. Public signals match this educational circuit (demo Merkle path).", "ok");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage(`Proof generation failed: ${msg}`, "err");
    } finally {
      setProving(false);
    }
  }

  async function submitWithdraw() {
    setMessage("Submitting withdraw…", "neutral");
    try {
      const resp = await fetch(`${active?.backendUrl?.replace(/\/$/, "")}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof,
          root,
          nullifierHash,
          recipient: active?.recipient,
          token: active?.token,
          amount: parseEther(active?.amount ?? "0").toString()
        })
      });
      const data = (await resp.json()) as { message?: string; error?: string; txHash?: string };
      if (!resp.ok) {
        setMessage(data.message ?? data.error ?? "Unknown error", "err");
        return;
      }
      setMessage(`Withdraw accepted. Tx: ${data.txHash ?? "—"}`, "ok");
      
      // Refresh balances
      if (walletAddress && active?.token) {
        try {
          const provider = new BrowserProvider((window as any).ethereum);
          const t = new Contract(active.token, erc20Abi, provider);
          setTokenBalance(formatEther(await t.balanceOf(walletAddress)));
          setEthBalance(formatEther(await provider.getBalance(walletAddress)));
        } catch (e) {}
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setMessage(message, "err");
    }
  }

  async function refreshGasEstimates() {
    setGasError(null);
    setGasDeposit(null);
    setGasWithdrawSelf(null);
    if (!active?.poolAddress) {
      setGasError("Pool address required");
      return;
    }
    const eth = (window as Window & { ethereum?: unknown }).ethereum;
    if (!eth) {
      setGasError("Connect wallet to estimate gas");
      return;
    }
    try {
      const provider = new BrowserProvider(eth as never);
      const signer = await provider.getSigner();
      const from = await signer.getAddress();
      const pool = new Contract(active.poolAddress, poolAbi, signer);
      const token = new Contract(active.token, erc20Abi, signer);
      const amt = parseEther(active.amount);
      
      // Use unique commitment for deposit gas estimation to prevent CommitmentAlreadyUsed() reversion
      const estimateCommitment = keccak256(toUtf8Bytes(`${active.secret || "x"}-estimate-${Date.now()}:${active.token}:${active.amount}`));

      try {
        const approveGas = await token.approve.estimateGas(active.poolAddress, amt);
        const depositGas = await pool.deposit.estimateGas(active.token, amt, estimateCommitment);
        const depositTotal = approveGas + depositGas;
        setGasDeposit(depositTotal.toString());
      } catch (err: any) {
        const msg = err.shortMessage || err.message || "reverted";
        if (msg.includes("allowance")) {
          setGasDeposit("~150000 (Exact requires actual allowance)");
        } else if (msg.includes("0xb7c01e1e") || msg.includes("0x")) {
          // 0xb7c01e1e or similar hex corresponds to custom errors like InvalidAmount or CommitmentAlreadyUsed 
          // that Ethers v6 didn't map in the estimateGas phase.
          setGasDeposit("~150000 (Gas Error: Check your input amount)");
        } else {
          setGasError(`Deposit gas error: ${msg}`);
        }
      }

      try {
        const validRoot = root && root.length === 66 ? root : await pool.latestRoot();
        const withdrawGas = await pool.withdraw.estimateGas(
          "0x1234",
          validRoot,
          keccak256(toUtf8Bytes(`nullifier-estimate-${Date.now()}`)),
          from,
          active.token,
          amt
        );
        setGasWithdrawSelf(withdrawGas.toString());
      } catch (err: any) {
        const msg = err.shortMessage || err.message || "reverted";
        if (msg.includes("balance")) {
          setGasWithdrawSelf("~200000 (Exact requires pool balance)");
        } else {
          setGasError(prev => prev ? `${prev} | Withdraw gas error: ${msg}` : `Withdraw gas error: ${msg}`);
        }
      }
    } catch (e: any) {
      setGasError(e.message || "Gas estimation failed");
    }
  }

  function addProfile() {
    const name = window.prompt("Profile name", `User ${profiles.length + 1}`);
    if (name === null) return;
    const base = active ?? defaultProfile();
    const p = createProfile({
      name: name || `User ${profiles.length + 1}`,
      secret: "",
      poolAddress: base.poolAddress,
      backendUrl: base.backendUrl,
      token: base.token,
      amount: base.amount,
      recipient: base.recipient
    });
    setProfiles((prev) => [...prev, p]);
    setActiveId(p.id);
  }

  function removeProfile() {
    if (profiles.length <= 1) {
      setMessage("Keep at least one profile.", "err");
      return;
    }
    const remaining = profiles.filter((p) => p.id !== activeId);
    setProfiles(remaining);
    setActiveId(remaining[0]!.id);
  }

  if (!active) {
    return <div className="app-shell">Loading…</div>;
  }

  const display = (v: string, opts?: { ether?: boolean }) => {
    if (!v) return "—";
    if (hideBalances) return "••••••";
    if (opts?.ether && v.includes(".")) return v;
    if (v.startsWith("0x") && v.length > 18) return `${v.slice(0, 10)}…${v.slice(-8)}`;
    return v;
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          Private DeFi Liquidity Pool
          <span className="badge">Capstone UI</span>
        </h1>
        <p>
          Deposits, in-browser Groth16 withdrawal proofs, relayer submission, optional balance privacy, and gas
          comparison — with multiple saved profiles per browser.
        </p>
      </header>

      <div className="toolbar">
        <label>
          <span>Profile</span>
          <select
            value={activeId}
            onChange={(e) => {
              setActiveId(e.target.value);
            }}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={hideBalances}
            onChange={(e) => setHideBalances(e.target.checked)}
          />
          Hide balances &amp; amounts
        </label>
        <div className="profile-actions">
          <button type="button" className="btn btn-secondary" onClick={addProfile}>
            Add user
          </button>
          <button type="button" className="btn btn-secondary" onClick={removeProfile}>
            Remove user
          </button>
        </div>
      </div>

      <div className="field">
        <label>Profile name</label>
        <input value={active.name} onChange={(e) => patchActive({ name: e.target.value })} />
      </div>

      <div className="grid grid-two" style={{ marginBottom: 18 }}>
        <div className="card">
          <h2>Wallet</h2>
          <p className="subtitle">Connection and balances (masked when privacy is on).</p>
          <p className="mono-block">
            <strong>Address</strong> {walletAddress ? display(walletAddress) : "Not connected"}
          </p>
          <p className="mono-block">
            <strong>ETH</strong> {display(ethBalance || "", { ether: true })}
          </p>
          <p className="mono-block">
            <strong>Token</strong> {display(tokenBalance || "", { ether: true })}
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={connectWallet}>
              Connect wallet
            </button>
            {walletAddress && (
              <button type="button" className="btn btn-secondary" onClick={() => void claimTestFunds()}>
                Claim Test ETH &amp; Tokens
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Gas comparison</h2>
          <p className="subtitle">
            Deposit path sums approve + deposit. Withdraw (self) estimates a direct <code>withdraw</code> call;
            relayer flow usually costs you ~0 gas on L2s/L1s aside from optional tips.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={() => void refreshGasEstimates()}>
              Refresh estimates
            </button>
          </div>
          {gasError && <p className="status err">{gasError}</p>}
          <div className="gas-grid">
            <div className="gas-tile">
              <h3>Deposit (approve + deposit)</h3>
              <div className="value">{gasDeposit ?? "—"}</div>
              <div className="hint">Total gas units (approximate; depends on token implementation).</div>
            </div>
            <div className="gas-tile">
              <h3>Withdraw (you broadcast)</h3>
              <div className="value">{gasWithdrawSelf ?? "—"}</div>
              <div className="hint">Compared to relayer: you typically pay 0 for the L1/L2 tx itself.</div>
            </div>
            <div className="gas-tile" style={{ gridColumn: "1 / -1" }}>
              <h3>Withdraw (relayer)</h3>
              <div className="value">0</div>
              <div className="hint">User-signed payloads are off-chain; relayer pays execution gas.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-two">
        <section className="card">
          <h2>Deposit note</h2>
          <p className="subtitle">Per-profile note material and ERC-20 deposit into the pool.</p>
          <div className="field">
            <label>Pool address</label>
            <input value={active.poolAddress} onChange={(e) => patchActive({ poolAddress: e.target.value })} />
          </div>
          <div className="field">
            <label>Secret</label>
            <input
              type={hideBalances ? "password" : "text"}
              value={active.secret}
              onChange={(e) => patchActive({ secret: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Token address</label>
            <input value={active.token} onChange={(e) => patchActive({ token: e.target.value })} />
          </div>
          <div className="field">
            <label>Amount (ETH units)</label>
            <input value={active.amount} onChange={(e) => patchActive({ amount: e.target.value })} />
          </div>
          <p>
            <strong>Commitment preview</strong>
          </p>
          <p className={`mono-block ${hideBalances ? "hidden-val" : ""}`}>{commitmentPreview}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => void depositNote()}>
              Approve + deposit
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Withdraw (with proof)</h2>
          <p className="subtitle">
            Generate a Groth16 proof locally from this profile&apos;s secret, amount, token, and recipient (demo
            left-most Merkle path, matching the bundled circuit). Then submit to your relayer.
          </p>
          <div className="field">
            <label>Relayer / backend URL</label>
            <input value={active.backendUrl} onChange={(e) => patchActive({ backendUrl: e.target.value })} />
          </div>
          <div className="field">
            <label>Recipient</label>
            <input value={active.recipient} onChange={(e) => patchActive({ recipient: e.target.value })} />
          </div>
          <div className="field">
            <label>Proof (bytes)</label>
            <textarea className={hideBalances ? "hidden-val" : ""} readOnly value={proof} rows={3} />
          </div>
          <div className="field">
            <label>Root (bytes32)</label>
            <input className={hideBalances ? "hidden-val" : ""} value={root} onChange={(e) => setRoot(e.target.value)} />
          </div>
          <div className="field">
            <label>Nullifier hash (bytes32)</label>
            <input
              className={hideBalances ? "hidden-val" : ""}
              value={nullifierHash}
              onChange={(e) => setNullifierHash(e.target.value)}
            />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" disabled={proving} onClick={() => void runGenerateProof()}>
              {proving ? "Proving…" : "Generate proof"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => void refreshOnChainRoot()}>
              Use on-chain root
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => void refreshRootFromBackend()}>
              Root from backend
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void submitWithdraw()}>
              Submit withdraw
            </button>
          </div>
        </section>
      </div>

      {status && (
        <p className={`status ${statusKind === "ok" ? "ok" : ""} ${statusKind === "err" ? "err" : ""}`}>{status}</p>
      )}
    </div>
  );
}

function ethersZeroAddr(): string {
  return "0x0000000000000000000000000000000000000000";
}
