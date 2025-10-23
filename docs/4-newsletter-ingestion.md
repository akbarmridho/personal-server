# **Task Specification: Miniflux Newsletter Ingestion to Knowledge Base via Activepieces**

## **1. Objective**

Create an **automated Activepieces workflow** that runs **daily at 20:00 WIB**, fetching the latest finance newsletters from **Miniflux** and ingesting them into the **Knowledge Base (KB Backend)**.

The goal is to ensure all new finance newsletters are available for semantic search and analysis by AI agents — without duplicating already ingested documents.

## **2. Background**

* **Miniflux** collects RSS feeds, including daily **Stockbit Snips** and **Makmur.id** newsletters, forwarded via the *Kill the Newsletter* service.
* **KB Backend** (`kb-backend`) serves as the knowledge base that supports document ingestion for retrieval-augmented generation (RAG).
* **Activepieces** (`https://ap.akbarmr.dev`) will handle orchestration of data ingestion between Miniflux and the KB Backend.

The workflow should ensure:

* Only **new newsletters** are ingested (idempotent behavior).
* **Retries** are implemented for transient ingestion failures.
* **Telegram notification** is sent after each run summarizing the results.

## **3. System Overview**

| Service          | Purpose                               | Access URL / Info               |
| ---------------- | ------------------------------------- | ------------------------------- |
| **Miniflux**     | RSS feed aggregator for newsletters   | `https://miniflux.akbarmr.dev/` |
| **KB Backend**   | Knowledge base for AI agent ingestion | `https://kb.akbarmr.dev/`       |
| **Activepieces** | Workflow automation platform          | `https://ap.akbarmr.dev/`       |

## **4. Implementation Plan**

### **4.1 Preparation**

1. Use `GET /rag/collections` on `kb-backend` to locate the collection named **Finance Newsletter** and note its **collection ID**.
2. Check the feed id for feed **“Finance - Newsletter”** in Miniflux.

### **4.2 Workflow Design (Activepieces)**

#### **Trigger**

* **Type:** Scheduled
* **Frequency:** Daily at **20:00 WIB**

#### **Configurable Parameter**

* Add a configurable parameter to **set an old date limit** when fetching feed entries, allowing backfilling of older newsletters if needed.

#### **Steps**

1. **Fetch Feed Items**

   * Retrieve newsletter entries from the Miniflux feed *Finance - Newsletter*.
   * Apply the configurable date limit if provided.

2. **For Each Feed Item**

   * Check if the item already exists in KB Backend by querying:
     `GET /rag/collections/{collection_id}/documents?title={feed_title}`

     * If a document with the same title exists, skip ingestion.
   * If not found, ingest the document into KB Backend using the HTML content.
   * Run ingestion **sequentially** (one item at a time).
   * Implement a **retry mechanism** for ingestion failures.

3. **Notify Completion**

   * Send a Telegram message summarizing the workflow results, including counts for successful ingestions, skipped items, and failures.

## **5. Expected Data Flow**

```
Kill the Newsletter → Miniflux → Activepieces → KB Backend → Telegram Notification
```

## **6. Deliverables**

All deliverables should be placed under the `docs/deliverables` directory in the project repository:

* A Markdown document summarizing the workflow and setup steps.
* A short README explaining how to configure and use the backfill date parameter.
* Screenshots showing:

  * Workflow configuration in Activepieces
  * Telegram notification summary
  * Verification of ingested newsletters in KB Backend

## **7. References**

* **Miniflux API Docs:** [https://miniflux.app/docs/api.html](https://miniflux.app/docs/api.html)
* **KB Backend API Playground:** [https://kb.akbarmr.dev/docs](https://kb.akbarmr.dev/docs)
* **Activepieces Docs:** [https://www.activepieces.com/docs](https://www.activepieces.com/docs)
