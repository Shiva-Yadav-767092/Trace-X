# TRACE-X Transparent Limitations & Forensic Boundaries

### 1. Ingestion Integrity vs. Origin Authenticity
- Calculating SHA-256 upon upload proves stored bytes match the received file. It cannot prove that the file was authentic or untampered prior to handover to TRACE-X.
- Courtroom admissibility requires physical chain-of-custody documentation and write-blocker hardware logs.

### 2. IP Address Attribution Limits
- A shared public IP address (such as `198.51.100.45`) does not prove a single individual or machine was responsible. Shared public IPs frequently reflect CGNAT, corporate forward proxies, VPN exit nodes, or cloud hosting providers.

### 3. Chronological Sequencing with Clock Skew
- Distributed sensors often experience clock drift. When sub-second precision or explicit UTC timezone offsets are absent in raw logs, absolute chronological sequencing is an approximation.
- TRACE-X explicitly tags these events with `UNCERTAIN` precision and avoids mathematical causal claims.

### 4. Parser Format Extensibility
- Current production parser modules support `.eml`, `.json`, `.csv`, `.log`, and `.txt`.
- Binary forensic disk formats (raw `dd` images, `E01`, `PCAP`, raw `EVTX`) require specialized binary decompression and are targeted for v2.0 parser plugins. Unsupported files are explicitly rejected with diagnostic feedback rather than silently ingested.
