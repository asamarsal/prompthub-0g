# PromptHub Update Plan (Execution Ready)

## 1. Tujuan Update
Dokumen ini mengubah strategi menjadi rencana eksekusi teknis yang siap dikerjakan tim untuk demo Hackathon 0G.

Target hasil:
- Demo end-to-end tanpa mock data.
- Semua transaksi utama tercatat on-chain dan tampil di UI.
- Integrasi 0G stack jelas: 0G EVM, 0G Storage, 0G Compute, Agentic ID.

---

## 2. Scope Freeze (Wajib untuk Demo)
Fitur berikut wajib selesai dulu sebelum menambah fitur baru:

1. Creator upload prompt + attachment ke 0G Storage.
2. Publish prompt ke marketplace contract (0G EVM).
3. Buyer preview score + buy prompt + unlock konten premium.
4. Contest: fund -> submit entry -> declare winner.
5. Hire escrow: create job -> verify escrow -> progress status.
6. Tampilkan hash penting di UI (tx hash, root hash, contract address).

Out of scope sementara:
- Secondary marketplace kompleks.
- Governance tokenomics.
- Fitur sosial non-kritis yang tidak mempengaruhi flow transaksi.

---

## 3. Prioritas Fitur (P0/P1/P2)

## P0 - Wajib Demo
- Prompt Versioning On-Chain.
- Prompt JSON Standard.
- Live Preview / Try Before Buy (0G Compute).
- Premium Content Access Control (unlock berbasis verifikasi pembelian).
- End-to-end contest + escrow hire tanpa mock.

## P1 - Nilai Bisnis Tinggi
- Revenue sharing multi-creator.
- Anti-spam contest submission (deposit kecil / rate limit / sybil checks).
- Reputation weighting dari Agent ID + aktivitas on-chain.

## P2 - Inovasi Lanjutan
- Prompt bundle / workflow package.
- Verifiable execution proof.
- Agentic workflow marketplace.

---

## Progress Eksekusi (Current)
- [x] End-to-end contest tanpa mock CID (entry uses real 0G Storage rootHash).
- [x] End-to-end escrow hire dengan tx_id + verify flow backend.
- [x] Address normalization FE/BE (lowercase) untuk mencegah mismatch ownership/purchase.
- [x] Backend purchase verification dipindah ke EVM RPC (`eth_getTransactionReceipt`) dari legacy Hiro/Stx flow.
- [x] x402 middleware diadaptasi ke 0G EVM receipt validation.
- [x] Smart contract hardening:
  - [x] `PromptHubTreasury`: `withdraw` pakai `call` + recipient validation.
  - [x] `PromptHubEscrowHire`: `resolveDispute` hanya boleh payout ke client/artist.
  - [x] `PromptHubContests`: semua tier amount wajib > 0.
  - [x] `AgentRegistry`: metadata update event + validation.
  - [x] `PromptHubMarketplace`: prompt versioning on-chain (`createPromptVersion`, `PromptVersioned`, history getter).
- [ ] Prompt JSON Standard final schema + validator backend/frontend.
- [ ] Live Preview 0G Compute final integration (production-ready key + fallback strategy).
- [ ] Agentic ID scoring/reputation weighting penuh.

---

## 4. Breakdown Task Teknis

## 4.1 Smart Contract
1. Marketplace:
- Tambah versioning per prompt/token.
- Simpan pointer `rootHash` versi terbaru.
- Event wajib: `PromptListed`, `PromptPurchased`, `PromptRelisted`, `PromptVersioned`.

2. Contest:
- Pastikan `contestId` on-chain selalu tersinkron ke backend.
- Tambah guard anti-spam submission (opsional P1).

3. Escrow Hire:
- Pastikan alur `createJob` -> verify -> status update.
- Siapkan path dispute/timeout (minimal struktur P1).

Definition of Done:
- Semua contract lulus compile + deploy + verify explorer.
- ABI final sinkron dengan frontend.

## 4.2 Backend (Laravel)
1. Prompt:
- Simpan metadata versi prompt.
- Simpan `rootHash`, `tx_id`, `contract_id` konsisten.

2. Contest:
- Simpan `onchain_contest_id`.
- Endpoint verify fund mengubah status ke `OPEN`.

3. Hire:
- Simpan `tx_id` escrow.
- Endpoint verify escrow mengubah status ke `IN_PROGRESS`.

4. Premium unlock:
- Validasi pembelian sebelum membuka konten asli.
- Return payload hash/proof untuk audit.

Definition of Done:
- Semua endpoint utama punya validasi input dan status flow benar.
- Tidak ada mismatch skema DB dengan payload frontend.

## 4.3 Frontend (Next.js)
1. Marketplace:
- Publish, buy, relist/delist, update price via `ethers` real call.
- Tampilkan tx hash dan link explorer.

2. Contest:
- Submit entry pakai `entryId` nyata dari 0G Storage (bukan mock CID).
- Declare winner dari owner flow.

3. Hire:
- Fund escrow + create hire request + verify status.

4. Premium unlock:
- UI unlock jelas: locked, purchased, unlocked.

5. Observability:
- Badge status transaksi (pending/success/failed).
- RootHash + on-chain id ditampilkan di halaman detail.

Definition of Done:
- `npx tsc --noEmit` hijau.
- Semua tombol aksi inti benar-benar trigger tx on-chain.

---

## 5. Sprint Plan Singkat (7 Hari)

Hari 1:
- Finalisasi contract ABI/event + deploy testnet awal.
- Update env frontend/backend.

Hari 2:
- Stabilkan flow marketplace (publish/buy/relist/delist).
- Sinkron tx log ke backend.

Hari 3:
- Stabilkan contest flow (fund/submit/winner).
- Hilangkan seluruh mock data contest.

Hari 4:
- Stabilkan hire escrow flow.
- Tambah verify + status lifecycle.

Hari 5:
- Integrasi 0G Compute untuk preview/scoring.
- Simpan score result + timestamp.

Hari 6:
- Integrasi Agentic ID untuk creator verification + reputation badge.
- Perbaikan UX + failure handling.

Hari 7:
- Full rehearsal demo + bug fixing + freeze release.

---

## 6. KPI Demo (Harus Ditampilkan ke Juri)
- Jumlah prompt published on-chain.
- Conversion try/score -> purchase.
- Success rate transaksi on-chain.
- Contest completion rate.
- Escrow completion rate.
- Average prompt score sebelum/after version update.

---

## 7. Risk dan Mitigasi
1. RPC testnet tidak stabil.
- Mitigasi: fallback RPC + retry policy + queue status pending.

2. Mismatch ABI/contract address.
- Mitigasi: single source `contracts.ts` + checklist verify setelah deploy.

3. Data backend tidak sinkron dengan on-chain.
- Mitigasi: simpan tx hash wajib + endpoint reconcile + cron re-sync.

4. Unlock konten bocor.
- Mitigasi: simpan konten premium terenkripsi + unlock setelah verify pembelian.

---

## 8. Checklist Go-Live Testnet
- Contract deployed + verified explorer.
- Env frontend/backend sudah pakai address final.
- Migration backend terbaru sudah jalan.
- Semua flow P0 sukses minimal 1 kali dengan wallet berbeda.
- Bukti tx hash + rootHash terdokumentasi.
- Tidak ada mock path pada flow utama.

---

## 9. Positioning untuk Pitch
Narasi resmi:
- Bukan hanya marketplace prompt.
- PromptHub adalah trustless AI creator IP infrastructure di 0G.

Tagline demo:
- Upload -> RootHash -> Publish -> Score -> Buy -> Unlock (all verifiable).
