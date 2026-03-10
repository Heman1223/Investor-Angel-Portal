# SECURITY & COMPLIANCE

## Role-Based Access Control (RBAC) & Boundaries
* The system enforces strict architectural boundaries separating `INVESTOR` and `COMPANY_USER` profiles.
* **Investors** are shielded from one another securely via authentication middleware validating JWT `investorId`.
* **Company Users** are authorized implicitly by querying the `CompanyMembership` bridging table to see if they possess `ADMIN/MEMBER` privileges for the requested `startupId`.
* Direct object references (`startupId`) passed via URL or Body are validated against the logged-in User's ownership or membership, preventing horizontal tracking.

## Attack Vectors
* **Content-Type Spoofing**: All document uploads pass through a `multer` boundary that checks file metadata and MIME types, bouncing executable or arbitrary files aggressively.
* **Man in the Middle (MitM)**: Production traffic routes exclusively over HTTPS. A middleware redirect enforces encrypted traffic across all proxy layers.
* **CORS**: Enforced explicitly by whitelisting trusted URL patterns. 
* **Brute Force**: Express-Rate-Limit exists to throttle aggressive network attempts across `auth` routes, heavily deterring credential stuffing.

## PII Handling and Data Retention
* **Personally Identifiable Information**: Names and Emails are stored in relational databases explicitly required for application function.
* No internal plaintext matching of passwords exists (`bcrypt`, Cost=10/12).
* **Retention Strategy**: High value system records (Updates, Exits, Investments) employ soft-delete patterns (`isArchived`, `status='written_off'`) rather than explicit destructive `DELETE` patterns to preserve analytical data continuity. 
